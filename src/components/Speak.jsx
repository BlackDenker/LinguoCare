import React, { useState, useRef } from 'react';

export default function Speak({ setView, handleMouseMove }) {
  const [step, setStep] = useState(1); // 1: Topic, 2: Sentences, 3: Speak
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [sentences, setSentences] = useState([]);
  const [selectedSentence, setSelectedSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [retryWaitMessage, setRetryWaitMessage] = useState(null);
  const [generalError, setGeneralError] = useState(null);
  const [accuracy, setAccuracy] = useState(80); // Default to 80%

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const predefinedTopics = [
    'Pasado Simple',
    'Presente Perfecto',
    'Condicionales',
    'Phrasal Verbs Comunes',
    'Vocabulario de Viajes'
  ];

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const callWithRetry = async (url, body, onWaiting, isFormData = false) => {
    const MAX_RETRIES = 5;
    let attempt = 0;
    while (true) {
      const options = { method: 'POST' };
      if (isFormData) {
        options.body = body;
      } else {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
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

  const handleGenerateSentences = async () => {
    const finalTopic = topic === 'custom' ? customTopic : topic;
    if (!finalTopic.trim()) return;

    setLoading(true);
    setGeneralError(null);
    setRetryWaitMessage(null);
    try {
      const result = await callWithRetry(
        '/api/generate_sentences',
        { topic: finalTopic, count: 5 },
        setRetryWaitMessage
      );
      
      if (result.ok) {
        setSentences(result.data.sentences);
        setStep(2);
      } else if (result.errorType === 'quota_exhausted') {
        setGeneralError('quota_exhausted');
      } else if (result.errorType === 'rate_limit_exceeded') {
        setGeneralError('rate_limit_exceeded');
      } else {
        setGeneralError(result.message);
      }
    } catch (err) {
      console.error('Error fetching sentences:', err);
      setGeneralError('Error de red al generar las frases.');
    } finally {
      setLoading(false);
      setRetryWaitMessage(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        await verifyPronunciation(audioBlob);
      };

      mediaRecorder.start();
      setRecording(true);
      setEvaluation(null);
      setDetails(null);
    } catch (err) {
      console.error('Error accessing mic:', err);
      alert('Permiso de micrófono denegado o no disponible.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
    }
  };

  // ── Convierte cualquier audio blob a WAV usando Web Audio API (sin ffmpeg) ──
  const convertBlobToWav = async (audioBlob) => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();

    const numChannels = 1; // Mono para Allosaurus
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.getChannelData(0); // canal mono

    // PCM 16-bit
    const pcm16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Construir cabecera WAV
    const wavBuffer = new ArrayBuffer(44 + pcm16.byteLength);
    const view = new DataView(wavBuffer);
    const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + pcm16.byteLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);          // chunk size
    view.setUint16(20, 1, true);           // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate (mono 16-bit)
    view.setUint16(32, 2, true);           // block align
    view.setUint16(34, 16, true);          // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, pcm16.byteLength, true);
    new Int16Array(wavBuffer, 44).set(pcm16);

    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  const verifyPronunciation = async (audioBlob) => {
    setLoading(true);
    try {
      // Convertir a WAV en el navegador antes de enviar
      const wavBlob = await convertBlobToWav(audioBlob);

      const formData = new FormData();
      formData.append('audio', wavBlob, 'record.wav');
      formData.append('sentence', selectedSentence);
      formData.append('accuracy', accuracy);

      const response = await fetch('/api/pronunciation', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        setEvaluation(data.evaluation);
      } else {
        alert(data.message || 'Error evaluando el audio.');
      }
    } catch (err) {
      console.error('Error verifying pronunciation:', err);
      alert('Error de red al evaluar.');
    } finally {
      setLoading(false);
    }
  };

  const getDetails = async (wordData) => {
    if (wordData.correct) return;
    
    setDetailsLoading(true);
    setDetails(null);
    setGeneralError(null);
    setRetryWaitMessage(null);
    try {
      const result = await callWithRetry(
        '/api/pronunciation_details',
        {
          word: wordData.word,
          expected_phonemes: wordData.expected_phonemes,
          actual_phonemes: wordData.actual_phonemes,
          sentence: selectedSentence
        },
        setRetryWaitMessage
      );

      if (result.ok) {
        setDetails(result.data.details);
      } else if (result.errorType === 'quota_exhausted') {
        setGeneralError('quota_exhausted');
      } else if (result.errorType === 'rate_limit_exceeded') {
        setGeneralError('rate_limit_exceeded');
      } else {
        setGeneralError(result.message);
      }
    } catch (err) {
      console.error('Error getting details:', err);
      setGeneralError('Error de conexión al obtener detalles.');
    } finally {
      setDetailsLoading(false);
      setRetryWaitMessage(null);
    }
  };

  return (
    <main className="card wide" onMouseMove={handleMouseMove} style={{ padding: '2rem', maxWidth: '800px', width: '100%' }}>
      <h1 className="title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        Práctica de <span className="highlight">Pronunciación</span>
      </h1>

      {step === 1 && (
        <div className="topic-selection" style={{ width: '100%' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Selecciona un tema para practicar:</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {predefinedTopics.map((t, idx) => (
              <button 
                key={idx} 
                className={`btn ${topic === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textAlign: 'left', padding: '0.75rem' }}
                onClick={() => setTopic(t)}
              >
                {t}
              </button>
            ))}
            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>O escribe tu propio tema:</label>
              <div 
                className="textarea-container"
                style={{ minHeight: 'auto' }}
              >
                <textarea
                  className="custom-textarea"
                  style={{ minHeight: '110px', resize: 'none' }}
                  placeholder="Ej: Entrevista de trabajo, Saludos formales..."
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value);
                    setTopic('custom');
                  }}
                  onFocus={() => setTopic('custom')}
                />
              </div>
            </div>
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '2rem' }}
            onClick={handleGenerateSentences}
            disabled={loading || !topic}
          >
            {loading ? (retryWaitMessage || 'Generando frases...') : 'Continuar'}
          </button>
          
          {generalError === 'quota_exhausted' ? (
              <div className="quota-exhausted-banner" style={{ marginTop: '1.5rem' }}>
                <span className="quota-icon">🚫</span>
                <div>
                  <strong>He llegado a mi límite diario</strong>
                  <p>Has agotado la cuota diaria de solicitudes. Por favor, intenta mañana.</p>
                </div>
              </div>
            ) : generalError === 'rate_limit_exceeded' ? (
              <div className="quota-exhausted-banner" style={{ marginTop: '1.5rem' }}>
                <span className="quota-icon">⏳</span>
                <div>
                  <strong>Límite de peticiones excedido</strong>
                  <p>Has hecho muchas peticiones muy rápido. Por favor, espera un minuto y vuelve a intentar.</p>
                </div>
              </div>
            ) : generalError ? (
            <div className="detail-error-banner" style={{ marginTop: '1.5rem' }}>⚠️ {generalError}</div>
          ) : null}
        </div>
      )}

      {step === 2 && (
        <div className="sentences-selection" style={{ width: '100%' }}>
          <button className="btn btn-secondary" onClick={() => setStep(1)} style={{ marginBottom: '1rem' }}>← Cambiar tema</button>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Selecciona una frase para pronunciar:</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sentences.map((sent, idx) => (
              <div 
                key={idx} 
                className="card" 
                style={{ padding: '1rem', cursor: 'pointer', border: selectedSentence === sent ? '2px solid var(--accent-light)' : '1px solid rgba(255,255,255,0.1)' }}
                onClick={() => {
                  setSelectedSentence(sent);
                  setEvaluation(null);
                  setDetails(null);
                  setAudioUrl(null);
                  setStep(3);
                }}
              >
                <p style={{ fontSize: '1.1rem', margin: 0 }}>{sent}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="speaking-practice" style={{ width: '100%' }}>
          <button className="btn btn-secondary" onClick={() => setStep(2)} style={{ marginBottom: '1rem' }}>← Volver a frases</button>
          
          <div style={{ width: '100%', padding: '2rem', textAlign: 'center', marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>"{selectedSentence}"</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%', maxWidth: '420px', margin: '0 auto' }}>
              <div style={{ width: '100%', textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nivel de exigencia:</label>
                <select
                  className="cac-select"
                  value={accuracy}
                  onChange={(e) => setAccuracy(Number(e.target.value))}
                  disabled={recording || loading}
                >
                  <option value={60}>60% — Básico, te entiendes a duras penas</option>
                  <option value={70}>70% — Intermedio, comprensible con esfuerzo</option>
                  <option value={80}>80% — Avanzado, buena pronunciación</option>
                  <option value={90}>90% — Casi nativo, acento muy leve</option>
                  <option value={100}>100% — Nativo perfecto</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', width: '100%' }}>
                {!recording ? (
                  <button className="btn btn-primary" style={{ borderRadius: '50px', padding: '1rem 2rem', width: '100%' }} onClick={startRecording} disabled={loading}>
                    🎤 Grabar
                  </button>
                ) : (
                  <button className="btn" style={{ background: '#ff4757', color: 'white', borderRadius: '50px', padding: '1rem 2rem', width: '100%' }} onClick={stopRecording}>
                    ⏹️ Detener
                  </button>
                )}
              </div>
            </div>

            {recording && <p style={{ color: '#ff4757', marginTop: '1rem', animation: 'pulse 1.5s infinite' }}>Grabando...</p>}
            {loading && <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Analizando pronunciación...</p>}
          </div>

          {evaluation && (
            <div className="evaluation-result" style={{ width: '100%', padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Resultado:</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', fontSize: '1.2rem', marginBottom: '1.5rem' }}>
                {evaluation.map((wordData, idx) => (
                  <span 
                    key={idx} 
                    style={{ 
                      color: wordData.correct ? '#2ed573' : '#ff4757',
                      borderBottom: wordData.correct ? 'none' : '2px dashed #ff4757',
                      cursor: wordData.correct ? 'default' : 'pointer',
                      padding: '0.2rem 0.4rem',
                      background: wordData.correct ? 'transparent' : 'rgba(255, 71, 87, 0.1)',
                      borderRadius: '4px'
                    }}
                    onClick={() => getDetails(wordData)}
                    title={wordData.correct ? 'Correcto' : 'Clic para más detalles'}
                  >
                    {wordData.word}
                  </span>
                ))}
              </div>

              {detailsLoading && <p>{retryWaitMessage || 'Cargando recomendaciones de IA...'}</p>}
              
              {generalError === 'quota_exhausted' ? (
                  <div className="quota-exhausted-banner" style={{ marginTop: '1.5rem' }}>
                    <span className="quota-icon">🚫</span>
                    <div>
                      <strong>He llegado a mi límite diario</strong>
                      <p>Has agotado la cuota diaria de solicitudes. Por favor, intenta mañana.</p>
                    </div>
                  </div>
                ) : generalError === 'rate_limit_exceeded' ? (
                  <div className="quota-exhausted-banner" style={{ marginTop: '1.5rem' }}>
                    <span className="quota-icon">⏳</span>
                    <div>
                      <strong>Límite de peticiones excedido</strong>
                      <p>Has hecho muchas peticiones muy rápido. Por favor, espera un minuto y vuelve a intentar.</p>
                    </div>
                  </div>
                ) : generalError && step === 3 ? (
                <div className="detail-error-banner" style={{ marginTop: '1.5rem' }}>⚠️ {generalError}</div>
              ) : null}
              
              {details && !generalError && (
                <div className="ai-feedback" style={{ width: '100%', padding: '1.5rem', background: 'rgba(112, 161, 255, 0.1)', border: '1px solid var(--accent)', borderRadius: '12px', marginTop: '1.5rem' }}>
                  <h4 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>💡 Recomendación</h4>
                  <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                    {details.split(/(?<![a-zA-Z])'(.+?)'(?![a-zA-Z])/g).map((part, i) => {
                      if (i % 2 === 1) {
                        return (
                          <span key={i} style={{ color: '#00f2fe', fontWeight: 'bold' }}>
                            "{part}"
                          </span>
                        );
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
