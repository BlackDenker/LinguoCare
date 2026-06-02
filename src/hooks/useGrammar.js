import { useState } from 'react';
import confetti from 'canvas-confetti';

// Always point to the same host as the frontend, but port 5000 (Flask)
const API_BASE = `http://${window.location.hostname}:5000`;

export function useGrammar() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('en'); // exclusively 'en' (learning English)
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [detailCards, setDetailCards] = useState(new Map()); // matchIdx -> { explanation, minimized }
  const [historyId, setHistoryId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);      // null | 'quota_exhausted' | string
  const [retryWaitMessage, setRetryWaitMessage] = useState(null);

  const triggerConfetti = () => {
    const duration = 2 * 1000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00f2fe', '#7f00ff', '#ff007f']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00f2fe', '#7f00ff', '#ff007f']
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const callWithRetry = async (url, body, onWaiting) => {
    const MAX_RETRIES = 5;
    let attempt = 0;
    while (true) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (data.status === 'success') {
        return { ok: true, data };
      }

      if (response.status === 429) {
        if (data.errorType === 'rate_limit_retry' && attempt < MAX_RETRIES) {
          const waitMs = (data.retryAfterSeconds + 1) * 1000;
          const msg = attempt === 0 ? 'Espérame, sigo pensando...' : 'Ya casi estoy...';
          onWaiting(msg);
          await sleep(waitMs);
          onWaiting(null);
          attempt++;
          continue;
        } else {
          return { ok: false, errorType: data.errorType === 'rate_limit_retry' ? 'rate_limit_exceeded' : 'quota_exhausted' };
        }
      }

      return { ok: false, errorType: 'generic', message: data.message || 'Error desconocido' };
    }
  };

  const fetchExplanation = async (matchIdx) => {
    if (!results || !results.matches[matchIdx]) return;

    if (detailCards.has(matchIdx)) {
      setDetailCards(prev => {
        const next = new Map(prev);
        next.set(matchIdx, { ...next.get(matchIdx), minimized: false });
        return next;
      });
      return;
    }

    const match = results.matches[matchIdx];
    setDetailLoading(true);
    setDetailError(null);
    setRetryWaitMessage(null);
    try {
      const result = await callWithRetry(
        `${API_BASE}/api/explain`,
        {
          errorSegment: match.errorSegment,
          message: match.message,
          phenomenon: match.recommendation?.phenomenon || '',
          topic: match.recommendation?.topic || '',
          sentence: match.sentence,
          replacements: match.replacements
        },
        (msg) => setRetryWaitMessage(msg)
      );
      if (result.ok) {
        setDetailCards(prev => {
          const next = new Map(prev);
          next.set(matchIdx, { explanation: result.data.explanation, minimized: false });
          
          // Background update to history
          const token = localStorage.getItem('token');
          if (token && historyId) {
             const exps = {};
             next.forEach((val, key) => { exps[key] = val.explanation; });
             const dataToSave = { text, results, explanations: exps };
             fetch(`${API_BASE}/api/history/${historyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ data: JSON.stringify(dataToSave) })
             }).catch(e => console.error(e));
          }
          
          return next;
        });
      } else if (result.errorType === 'quota_exhausted') {
        setDetailError('quota_exhausted');
      } else if (result.errorType === 'rate_limit_exceeded') {
        setDetailError('rate_limit_exceeded');
      } else {
        setDetailError(result.message || 'No se pudo generar la explicación.');
      }
    } catch (err) {
      setDetailError('Error de conexión al generar la explicación.');
    } finally {
      setDetailLoading(false);
      setRetryWaitMessage(null);
    }
  };

  const toggleMinimizeCard = (matchIdx) => {
    setDetailCards(prev => {
      const next = new Map(prev);
      const card = next.get(matchIdx);
      if (card) next.set(matchIdx, { ...card, minimized: !card.minimized });
      return next;
    });
  };

  const removeDetailCard = (matchIdx) => {
    setDetailCards(prev => {
      const next = new Map(prev);
      next.delete(matchIdx);
      return next;
    });
  };

  const checkGrammar = async (textToCheck = text, langToCheck = language) => {
    if (!textToCheck.trim()) return;
    setLoading(true);
    setSelectedMatch(null);
    setDetailCards(new Map());
    setDetailError(null);
    setRetryWaitMessage(null);
    try {
      const result = await callWithRetry(
        `${API_BASE}/api/check`,
        { text: textToCheck, language: langToCheck },
        (msg) => setRetryWaitMessage(msg)
      );
      if (result.ok) {
        setResults(result.data);

        // If authenticated, save to history
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const dataToSave = {
              text: textToCheck,
              results: result.data,
              explanations: {}
            };
            const histRes = await fetch(`${API_BASE}/api/history`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ module: 'textear', data: JSON.stringify(dataToSave) })
            });
            const histData = await histRes.json();
            if (histData.id) setHistoryId(histData.id);
          } catch (histErr) {
            console.error("Failed to save history:", histErr);
          }
        }

        if (result.data.matches.length === 0) triggerConfetti();
      } else if (result.errorType === 'quota_exhausted') {
        setDetailError('quota_exhausted');
      } else if (result.errorType === 'rate_limit_exceeded') {
        setDetailError('rate_limit_exceeded');
      } else {
        alert('Error al analizar el texto: ' + (result.message || ''));
      }
    } catch (error) {
      console.error(error);
      alert(`No se pudo conectar con el servidor. ¿Está corriendo el backend en ${API_BASE}?`);
    } finally {
      setLoading(false);
      setRetryWaitMessage(null);
    }
  };

  const applyReplacement = (matchIdx, replacement) => {
    if (!results || !results.matches) return;
    
    const match = results.matches[matchIdx];
    const before = text.slice(0, match.offset);
    const after = text.slice(match.offset + match.errorLength);
    const newText = before + replacement + after;
    
    setText(newText);
    setSelectedMatch(null);
    
    const delta = replacement.length - match.errorLength;
    
    const updatedMatches = results.matches
      .filter((_, idx) => idx !== matchIdx)
      .map(m => {
        if (m.offset > match.offset) {
          return {
            ...m,
            offset: m.offset + delta
          };
        }
        return m;
      });
      
    setResults({
      ...results,
      matches: updatedMatches
    });

    if (updatedMatches.length === 0) {
      triggerConfetti();
    }
  };

  return {
    text, setText,
    language, setLanguage,
    loading,
    results, setResults,
    selectedMatch, setSelectedMatch,
    detailCards,
    detailLoading,
    detailError,
    retryWaitMessage,
    triggerConfetti,
    fetchExplanation,
    toggleMinimizeCard,
    removeDetailCard,
    checkGrammar,
    applyReplacement
  };
}
