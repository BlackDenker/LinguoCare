import React, { useState, useEffect } from 'react';
import { MouthSVG, getPhonemeViseme } from './MouthShapes';

const API_BASE = `http://${window.location.hostname}:5000`;

export default function Historial({ handleMouseMove }) {
  const [activeTab, setActiveTab] = useState('textear');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null); // ID of item to delete (shows modal)
  const [expandedExplanations, setExpandedExplanations] = useState({});

  const toggleExplanation = (historyId, matchIdx) => {
    const key = `${historyId}-${matchIdx}`;
    setExpandedExplanations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Debes iniciar sesión para ver tu historial.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/history?module=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setHistory(data.history);
      } else {
        setError(data.message || 'Error al cargar el historial.');
      }
    } catch (err) {
      setError('Error de conexión al cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeTab]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/history/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setHistory(prev => prev.filter(h => h.id !== deleteId));
      } else {
        alert('No se pudo eliminar: ' + data.message);
      }
    } catch (err) {
      alert('Error de red al eliminar.');
    } finally {
      setDeleteId(null);
    }
  };

  const renderTextearItem = (item) => {
    let data;
    try {
      data = JSON.parse(item.data);
    } catch (e) {
      return <p>Datos inválidos</p>;
    }

    const date = new Date(item.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    const matchCount = data.results?.matches?.length || 0;
    
    return (
      <div className="history-card" key={item.id}>
        <div className="history-card-header">
          <span className="history-date">🕒 {date}</span>
          <button className="btn-delete" onClick={() => setDeleteId(item.id)}>🗑️ Eliminar</button>
        </div>
        <div className="history-content">
          <div className="history-text-box">
            <strong>Texto Original:</strong>
            <p>"{data.text}"</p>
          </div>
          
          <div className="history-stats">
            <span className={`history-badge ${matchCount > 0 ? 'wrong' : 'correct'}`}>
              {matchCount === 0 ? '🎉 Sin errores' : `⚠️ ${matchCount} errores encontrados`}
            </span>
          </div>

          {matchCount > 0 && data.results?.matches && (
            <div className="history-errors-list">
              {data.results.matches.map((m, idx) => (
                <div key={idx} className="history-error-item">
                  <div className="error-segment">"{m.errorSegment}"</div>
                  <div className="error-message">{m.message}</div>
                  
                  {data.explanations && data.explanations[idx] && (
                    <div className="history-explanation" style={{ marginTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                      <div 
                        className="history-explanation-header" 
                        onClick={() => toggleExplanation(item.id, idx)}
                        style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', paddingTop: '1rem' }}
                      >
                        <strong>💡 Recomendación solicitada</strong>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          {expandedExplanations[`${item.id}-${idx}`] ? '▲ Ocultar detalle' : '▼ Mostrar detalle'}
                        </span>
                      </div>
                      {expandedExplanations[`${item.id}-${idx}`] && (
                        <div className="history-explanation-body" style={{ marginTop: '1rem' }}>
                          <div className="explanation-examples">
                            <div className="ex-incorrect">❌ {data.explanations[idx].exampleIncorrect?.replace(/[*_~`"']/g, '')}</div>
                            <div className="ex-correct">✅ {data.explanations[idx].exampleCorrect?.replace(/[*_~`"']/g, '')}</div>
                          </div>
                          <p>{data.explanations[idx].deepExplanation?.replace(/[*_~`"']/g, '')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHablarItem = (item) => {
    let data;
    try {
      data = JSON.parse(item.data);
    } catch (e) {
      return <p>Datos inválidos</p>;
    }

    const date = new Date(item.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    const evaluation = data.evaluation || [];
    const incorrectCount = evaluation.filter(w => !w.correct).length;
    
    return (
      <div className="history-card" key={item.id}>
        <div className="history-card-header">
          <span className="history-date">🕒 {date}</span>
          <button className="btn-delete" onClick={() => setDeleteId(item.id)}>🗑️ Eliminar</button>
        </div>
        <div className="history-content">
          <div className="history-text-box">
            <strong>Frase Grabada:</strong>
            <p>"{data.text}"</p>
          </div>
          
          <div className="history-stats" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span className={`history-badge ${incorrectCount > 0 ? 'wrong' : 'correct'}`} style={{ marginBottom: 0 }}>
              {incorrectCount === 0 ? '🎉 Pronunciación perfecta' : `⚠️ ${incorrectCount} palabras a mejorar`}
            </span>
            {data.accuracy && (
              <span className="history-badge" style={{ marginBottom: 0, background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent)' }}>
                🎯 Nivel de exigencia: {data.accuracy}%
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            {evaluation.map((wordData, idx) => (
              <span 
                key={idx} 
                style={{ 
                  color: wordData.correct ? '#2ed573' : '#ff4757',
                  borderBottom: wordData.correct ? 'none' : '2px dashed #ff4757',
                  padding: '0.2rem 0.4rem',
                  background: wordData.correct ? 'transparent' : 'rgba(255, 71, 87, 0.1)',
                  borderRadius: '4px'
                }}
              >
                {wordData.word}
              </span>
            ))}
          </div>

          {incorrectCount > 0 && data.explanations && Object.keys(data.explanations).length > 0 && (
            <div className="history-errors-list">
              {Object.entries(data.explanations).map(([word, explanation], idx) => (
                <div key={idx} className="history-error-item" style={{ borderLeftColor: '#00f2fe', background: 'rgba(0, 242, 254, 0.05)' }}>
                  <div className="error-segment" style={{ color: '#00f2fe' }}>"{word}"</div>
                  
                  <div className="history-explanation" style={{ marginTop: '0.5rem', borderTop: 'none' }}>
                    <div 
                      className="history-explanation-header" 
                      onClick={() => toggleExplanation(item.id, `hablar-${idx}`)}
                      style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', paddingBottom: '0.5rem', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}
                    >
                      <strong>💡 Recomendación solicitada</strong>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {expandedExplanations[`${item.id}-hablar-${idx}`] ? '▲ Ocultar detalle' : '▼ Mostrar detalle'}
                      </span>
                    </div>
                    {expandedExplanations[`${item.id}-hablar-${idx}`] && (
                      <div className="history-explanation-body" style={{ marginTop: '1rem' }}>
                        <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                          {explanation.split(/(?<![a-zA-Z])'(.+?)'(?![a-zA-Z])/g).map((part, i) => {
                            if (i % 2 === 1) return <span key={i} style={{ color: '#00f2fe', fontWeight: 'bold' }}>"{part}"</span>;
                            return <span key={i}>{part}</span>;
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCaraACaraItem = (item) => {
    let data;
    try {
      data = JSON.parse(item.data);
    } catch (e) {
      return <p>Datos inválidos</p>;
    }

    const date = new Date(item.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
    const evaluation = data.evaluation || [];
    const incorrectCount = evaluation.filter(w => !w.correct).length;
    const correctCount = evaluation.filter(w => w.correct).length;
    const pct = evaluation.length > 0 ? Math.round((correctCount / evaluation.length) * 100) : 0;

    const visemeLabels = {
      closed: 'Bilabial', labiodental: 'Labiodental', dental: 'Dental',
      rounded: 'Redondeada', 'wide-open': 'Abierta', 'open-smile': 'Semiabierta',
      clenched: 'Sibilante', neutral: 'Neutral'
    };

    return (
      <div className="history-card" key={item.id}>
        <div className="history-card-header">
          <span className="history-date">🕒 {date}</span>
          <button className="btn-delete" onClick={() => setDeleteId(item.id)}>🗑️ Eliminar</button>
        </div>
        <div className="history-content">
          <div className="history-text-box">
            <strong>Frase Practicada:</strong>
            <p>"{data.text}"</p>
          </div>

          <div className="history-stats" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span className={`history-badge ${incorrectCount > 0 ? 'wrong' : 'correct'}`} style={{ marginBottom: 0 }}>
              {pct}% — {correctCount}/{evaluation.length} palabras
            </span>
            {data.accuracy && (
              <span className="history-badge" style={{ marginBottom: 0, background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent)' }}>
                🎯 Nivel de exigencia: {data.accuracy}%
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '1.05rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            {evaluation.map((wordData, idx) => (
              <span
                key={idx}
                style={{
                  color: wordData.correct ? '#2ed573' : '#ff4757',
                  borderBottom: wordData.correct ? 'none' : '2px dashed #ff4757',
                  padding: '0.2rem 0.4rem',
                  background: wordData.correct ? 'transparent' : 'rgba(255, 71, 87, 0.1)',
                  borderRadius: '4px'
                }}
              >
                {wordData.correct ? '✓' : '✗'} {wordData.word}
              </span>
            ))}
          </div>

          {incorrectCount > 0 && data.explanations && Object.keys(data.explanations).length > 0 && (
            <div className="history-errors-list">
              {Object.entries(data.explanations).map(([word, expData], idx) => {
                const expectedPhonemes = expData.expected_phonemes || '';
                const aiDetails = expData.details || '';
                return (
                  <div key={idx} className="history-error-item" style={{ borderLeftColor: '#a855f7', background: 'rgba(168,85,247,0.05)' }}>
                    <div className="error-segment" style={{ color: '#a855f7' }}>👄 "{word}"</div>
                    {expData.actual_phonemes && (
                      <div className="error-message" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Esperado: <code style={{ color: '#00f2fe' }}>{expectedPhonemes}</code> | Detectado: <code style={{ color: '#ff4757' }}>{expData.actual_phonemes}</code>
                      </div>
                    )}

                    {/* SVG mouth shapes for expected phonemes */}
                    {expectedPhonemes && (
                      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem', marginTop: '1rem' }}>
                        {expectedPhonemes.split(' ').map((ph, pIdx) => {
                          const viseme = getPhonemeViseme(ph);
                          return (
                            <div key={pIdx} style={{
                              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '10px', padding: '0.5rem', textAlign: 'center',
                              minWidth: '90px', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem'
                            }}>
                              <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>/{ph}/</div>
                              <div style={{ width: '52px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MouthSVG viseme={viseme} />
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>{visemeLabels[viseme]}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* AI Recommendation */}
                    {aiDetails && (
                      <div className="history-explanation" style={{ marginTop: '1rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div
                          className="history-explanation-header"
                          onClick={() => toggleExplanation(item.id, `cac-${idx}`)}
                          style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', paddingTop: '1rem' }}
                        >
                          <strong>💡 Recomendación IA</strong>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {expandedExplanations[`${item.id}-cac-${idx}`] ? '▲ Ocultar detalle' : '▼ Mostrar detalle'}
                          </span>
                        </div>
                        {expandedExplanations[`${item.id}-cac-${idx}`] && (
                          <div className="history-explanation-body" style={{ marginTop: '1rem' }}>
                            <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                              {aiDetails.split(/(?<![a-zA-Z])'(.+?)'(?![a-zA-Z])/g).map((part, i) => {
                                if (i % 2 === 1) return <span key={i} style={{ color: '#a855f7', fontWeight: 'bold' }}>"{ part}"</span>;
                                return <span key={i}>{part}</span>;
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderPlaceholder = (moduleName) => (
    <div className="history-empty">
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
      <h3>Historial de {moduleName} en construcción</h3>
      <p>Pronto podrás ver tu progreso detallado de este módulo aquí.</p>
    </div>
  );

  return (
    <main className="card wide" onMouseMove={handleMouseMove} style={{ padding: '2rem', maxWidth: '900px', width: '100%' }}>
      <h1 className="title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        Mi <span className="highlight">Historial</span>
      </h1>

      <div className="history-tabs">
        <button 
          className={`tab-btn ${activeTab === 'textear' ? 'active' : ''}`}
          onClick={() => setActiveTab('textear')}
        >
          ✍️ Textear
        </button>
        <button 
          className={`tab-btn ${activeTab === 'hablar' ? 'active' : ''}`}
          onClick={() => setActiveTab('hablar')}
        >
          🎙️ Hablar
        </button>
        <button 
          className={`tab-btn ${activeTab === 'caraacara' ? 'active' : ''}`}
          onClick={() => setActiveTab('caraacara')}
        >
          👁️ Cara a Cara
        </button>
      </div>

      <div className="history-body">
        {loading ? (
          <div className="spinner-container" style={{ margin: '3rem auto' }}>
            <div className="bouncing-dots">
              <div className="dot"></div><div className="dot"></div><div className="dot"></div>
            </div>
            <span>Cargando historial...</span>
          </div>
        ) : error ? (
          <div className="detail-error-banner" style={{ margin: '2rem 0' }}>⚠️ {error}</div>
        ) : (
          <div className="history-list">
            {activeTab === 'textear' && history.length === 0 && (
              <div className="history-empty">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <h3>Aún no hay historial</h3>
                <p>Evalúa tus textos en el módulo Textear para verlos aquí.</p>
              </div>
            )}
            
            {activeTab === 'textear' && history.map(renderTextearItem)}
            
            {activeTab === 'hablar' && history.length === 0 && (
              <div className="history-empty">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <h3>Aún no hay historial</h3>
                <p>Graba tus frases en el módulo Hablar para verlas aquí.</p>
              </div>
            )}
            {activeTab === 'hablar' && history.map(renderHablarItem)}
            
            {activeTab === 'caraacara' && history.length === 0 && (
              <div className="history-empty">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <h3>Aún no hay historial</h3>
                <p>Practica en el módulo Cara a Cara para ver tu progreso aquí.</p>
              </div>
            )}
            {activeTab === 'caraacara' && history.map(renderCaraACaraItem)}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>¿Eliminar este registro?</h3>
            <p>Esta acción no se puede deshacer y el registro desaparecerá de tu historial.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
