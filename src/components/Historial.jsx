import React, { useState, useEffect } from 'react';

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
            
            {activeTab === 'hablar' && renderPlaceholder('Hablar')}
            {activeTab === 'caraacara' && renderPlaceholder('Cara a Cara')}
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
