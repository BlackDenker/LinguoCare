import React from 'react';

export default function Inicio({ setView, handleMouseMove, userName }) {
  return (
    <div className="inicio-layout">
      
      {/* Login Promo Card - Only show if not logged in */}
      {!userName && (
        <div className="card login-cta-card" onMouseMove={handleMouseMove}>
          <div className="login-cta-content">
            <div className="login-cta-icon-wrapper">
              <span className="login-cta-icon">🔐</span>
            </div>
            <div className="login-cta-text">
              <h3>Guarda tu progreso</h3>
              <p>Inicia sesión gratis para llevar un historial de tus textos y ver cómo mejoras con el tiempo.</p>
            </div>
            <button 
              className="btn btn-primary login-cta-btn"
              onClick={() => setView('login')}
            >
              INICIAR SESION
            </button>
          </div>
        </div>
      )}

      {/* Main Feature Container */}
      <main className="card" onMouseMove={handleMouseMove}>
        <div id="inicio-section">
          <h1 id="main-title">Diagnóstico Lingüístico</h1>
          <p className="subtitle" id="main-subtitle">
            Analiza tus frases, identifica fenómenos gramaticales y descubre en qué temas necesitas enfocarte para mejorar tu nivel.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2rem' }}>
            <div className="cta-card" onClick={() => setView('textear')}>
              <h3>✍️ Evaluar tu redacción (Textear)</h3>
              <p>
                Escribe o pega tus textos en inglés. Nuestro asistente analizará la sintaxis, ortografía y concordancia en tiempo real.
              </p>
              <span className="cta-arrow">Comenzar a textear &rarr;</span>
            </div>

            <div className="cta-card" onClick={() => setView('hablar')}>
              <h3>🎙️ Práctica de Pronunciación (Hablar)</h3>
              <p>
                Selecciona temas recomendados y practica tu habla. Detecta tus fonemas y recibe explicaciones de pronunciación.
              </p>
              <span className="cta-arrow">Comenzar a hablar &rarr;</span>
            </div>

            <div className="cta-card" onClick={() => setView('caraacara')}>
              <h3>👁️ Visión y Pronunciación (Cara a Cara)</h3>
              <p>
                Visualiza los movimientos de tu boca con puntos de referencia en tiempo real mientras evalúas tu pronunciación fonema a fonema.
              </p>
              <span className="cta-arrow">Iniciar Cara a Cara &rarr;</span>
            </div>
          </div>
        </div>
      </main>
      
      {/* Future containers for other features can go here! */}
    </div>
  );
}
