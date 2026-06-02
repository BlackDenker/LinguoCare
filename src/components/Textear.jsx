import React from 'react';

export default function Textear({ grammar, handleMouseMove }) {
  const {
    text, setText, loading, results, setResults, selectedMatch, setSelectedMatch,
    detailCards, detailLoading, detailError, retryWaitMessage,
    fetchExplanation, toggleMinimizeCard, removeDetailCard, checkGrammar, applyReplacement
  } = grammar;

  const renderHighlightedText = () => {
    if (!results || !results.matches) return null;
    
    // Map each match to include its original index before sorting
    const sortedMatches = results.matches
      .map((match, originalIdx) => ({ ...match, originalIdx }))
      .sort((a, b) => a.offset - b.offset);

    const elements = [];
    let lastIndex = 0;

    sortedMatches.forEach((match, idx) => {
      // Text before the match
      if (match.offset > lastIndex) {
        elements.push(text.slice(lastIndex, match.offset));
      }
      
      // The highlighted error segment
      const errorText = text.slice(match.offset, match.offset + match.errorLength);
      elements.push(
        <span 
          key={idx} 
          className={`highlight-error ${selectedMatch === match.originalIdx ? 'selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            const next = selectedMatch === match.originalIdx ? null : match.originalIdx;
            setSelectedMatch(next);
            // Detail cards persist — do NOT clear them
          }}
        >
          {errorText}
        </span>
      );
      lastIndex = match.offset + match.errorLength;
    });

    // Remainder text
    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return elements;
  };

  return (
    <main 
      className="card wide"
      id="interactive-card"
      onMouseMove={handleMouseMove}
      onClick={() => setSelectedMatch(null)}
    >
      <div id="textear-section">
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'left' }}>
          Analizador de Textos
        </h1>
      
      <div className="editor-layout">
        {/* Left Panel: Inputs */}
        <div>
          <div className="panel-header">
            <span className="panel-title">✏️ Redacción</span>
          </div>
          
          <div className="textarea-container">
            <textarea
              className="custom-textarea"
              placeholder='Type your sentence here (e.g. "she dont know the answer")'
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (results) setResults(null); // Clear previous results when text changes
              }}
            />
            <div className="textarea-footer">
              <span className="char-counter">{text.length} caracteres</span>
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.95rem' }}
                onClick={() => checkGrammar()}
                disabled={loading || !text.trim()}
              >
                <span>Analizar Texto</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Analyzed Output */}
        <div>
          <div className="panel-header">
            <span className="panel-title">🔍 Resultados del Análisis</span>
          </div>

          {results && results.languageMismatch && results.languageMismatch.isMismatch && results.languageMismatch.detected === 'es' && (
            <div className="lang-mismatch-banner">
              <span className="lang-mismatch-icon">⚠️</span>
              <div className="lang-mismatch-content">
                <p className="lang-mismatch-text">
                  Parece que has escrito tu texto en <strong>Español</strong>. 
                  LinguoCare está diseñado exclusivamente para ayudarte a practicar y perfeccionar tu <strong>Inglés</strong>. 
                  Por favor, escribe tus frases en Inglés para analizarlas.
                </p>
              </div>
            </div>
          )}
          
          <div className="output-display-box">
            {loading ? (
              <div className="spinner-container">
                <div className="bouncing-dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
                <span>{retryWaitMessage || 'Procesando texto...'}</span>
              </div>
            ) : results ? (
              results.matches.length > 0 ? (
                <div>{renderHighlightedText()}</div>
              ) : (
                <div className="perfect-result">
                  <div className="perfect-title">🎉 ¡Texto impecable!</div>
                  <div className="perfect-desc">
                    No se detectaron errores lingüísticos o gramaticales. ¡Excelente redacción!
                  </div>
                </div>
              )
            ) : (
              <span className="placeholder-text">
                Escribe un texto en el panel izquierdo y haz clic en "Analizar Texto" para examinarlo.
              </span>
            )}
          </div>

          {/* Quick Fix Panel */}
          {results && selectedMatch !== null && results.matches[selectedMatch] && (
            <div className="quick-fix-card" onClick={(e) => e.stopPropagation()}>
              <div className="quick-fix-header">
                <span className="quick-fix-badge">💡 Corrección Rápida</span>
                <button className="quick-fix-close-btn" onClick={() => setSelectedMatch(null)}>
                  &times;
                </button>
              </div>
              <div className="quick-fix-body">
                <p className="quick-fix-desc">
                  {results.matches[selectedMatch].message}
                </p>
                <div className="quick-fix-actions">
                  <span className="quick-fix-action-title">Sugerencias:</span>
                  <div className="quick-fix-suggestions-list">
                    {results.matches[selectedMatch].replacements.length > 0 ? (
                      results.matches[selectedMatch].replacements.map((repl, rIdx) => (
                        <button 
                          key={rIdx} 
                          className="quick-fix-pill-btn"
                          onClick={() => applyReplacement(selectedMatch, repl)}
                        >
                          {repl}
                        </button>
                      ))
                    ) : (
                      <span className="quick-fix-no-suggestions">Sin sugerencias de reemplazo automático</span>
                    )}
                  </div>
                </div>
                {/* Más detalles button */}
                <div className="quick-fix-detail-row">
                  <button
                    className="btn-detail-expand"
                    onClick={() => fetchExplanation(selectedMatch)}
                    disabled={detailLoading}
                  >
                    {detailLoading ? (
                      <span className="detail-loading-dots">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                      </span>
                    ) : null}
                    {detailLoading
                      ? (retryWaitMessage || null)
                      : detailCards.has(selectedMatch)
                        ? '📖 Ver detalle →'
                        : '📖 Más detalles →'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>{/* end right panel */}

      </div>{/* end editor-layout */}

      {/* ── Full-width Detail Cards Section (below both columns) ── */}
      {(detailCards.size > 0 || detailError) && (
        <div className="detail-cards-section">

          {/* Error banners */}
          {detailError === 'quota_exhausted' ? (
            <div className="quota-exhausted-banner">
              <span className="quota-icon">🚫</span>
              <div>
                <strong>He llegado a mi límite diario</strong>
                <p>Has agotado la cuota diaria de solicitudes. Por favor, intenta mañana.</p>
              </div>
            </div>
          ) : detailError === 'rate_limit_exceeded' ? (
            <div className="quota-exhausted-banner">
              <span className="quota-icon">⏳</span>
              <div>
                <strong>Límite de peticiones excedido</strong>
                <p>Has hecho muchas peticiones muy rápido. Por favor, espera un minuto y vuelve a intentar.</p>
              </div>
            </div>
          ) : detailError ? (
            <div className="detail-error-banner">⚠️ {detailError}</div>
          ) : null}

          {/* Accumulated detail cards — one per error, minimizable */}
          {[...detailCards.entries()].map(([matchIdx, cardData]) => {
            const match = results?.matches[matchIdx];
            if (!match) return null;
            return (
              <div
                key={matchIdx}
                className={`detail-study-card ${cardData.minimized ? 'minimized' : ''}`}
              >
                <div className="detail-study-header">
                  <span className="detail-study-badge">📘 Análisis Detallado</span>
                  <span className="detail-study-error-word">"{match.errorSegment}"</span>
                  <span className="detail-study-topic">{match.recommendation?.topic}</span>
                  <div className="detail-study-controls">
                    <button
                      className="detail-minimize-btn"
                      onClick={() => toggleMinimizeCard(matchIdx)}
                      title={cardData.minimized ? 'Expandir' : 'Minimizar'}
                    >
                      {cardData.minimized ? '▼' : '▲'}
                    </button>
                    <button
                      className="quick-fix-close-btn"
                      onClick={() => removeDetailCard(matchIdx)}
                      title="Cerrar"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                {!cardData.minimized && (
                  <div className="detail-study-body">
                    <div className="examples-comparison">
                      <div className="example-item incorrect">
                        <span className="example-icon">❌</span>
                        <div>
                          <span className="example-label">Incorrecto:</span>
                          "{cardData.explanation.exampleIncorrect.replace(/[*_~`"']/g, '')}"
                        </div>
                      </div>
                      <div className="example-item correct">
                        <span className="example-icon">✅</span>
                        <div>
                          <span className="example-label">Correcto:</span>
                          "{cardData.explanation.exampleCorrect.replace(/[*_~`"']/g, '')}"
                        </div>
                      </div>
                    </div>
                    <p className="detail-deep-explanation">
                      {cardData.explanation.deepExplanation.replace(/[*_~`"']/g, '')}
                    </p>
                    {cardData.explanation.studyTopics?.length > 0 && (
                      <div className="study-topics-box">
                        <h4 className="study-topics-heading">📚 ¿Qué deberías estudiar?</h4>
                        <ul className="study-topics-list">
                          {cardData.explanation.studyTopics.map((topic, tIdx) => (
                            <li key={tIdx} className="study-topic-list-item">
                              <span className="bullet-point-icon">📖</span>
                              <span className="bullet-point-text">{topic}</span>
                            </li>
                          ))}
                        </ul>
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
    </main>
  );
}
