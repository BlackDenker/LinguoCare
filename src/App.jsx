import { useState } from 'react';
import Navbar from './components/Navbar';
import Inicio from './components/Inicio';
import Textear from './components/Textear';
import Speak from './components/Speak';
import CaraACara from './components/CaraACara';
import Login from './components/Login';
import Register from './components/Register';
import { useGrammar } from './hooks/useGrammar';

function App() {
  const [view, setView] = useState('inicio'); // 'inicio' | 'textear' | 'hablar' | 'caraacara' | 'login' | 'register'
  const [showLoginWarning, setShowLoginWarning] = useState(false);
  const [hasSeenLoginWarning, setHasSeenLoginWarning] = useState(false);
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || null);

  const handleLogin = (newToken, name) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userName', name);
    setToken(newToken);
    setUserName(name);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setUserName(null);
    setView('inicio');
  };

  const grammar = useGrammar();

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <>
      {/* Background Animated Blobs */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Global Login Warning Popup */}
      {showLoginWarning && (
        <div className="popup-overlay">
          <div className="popup-card">
            <div className="popup-icon-wrapper">
              <span className="popup-icon">👋</span>
            </div>
            <h2>¡Qué bueno tenerte por aquí!</h2>
            <p>
              Recuerda que actualmente estás usando LinguoCare <strong>sin iniciar sesión</strong>. 
              Puedes evaluar tus textos libremente, pero tu progreso y el historial de tus redacciones 
              no quedarán guardados.
            </p>
            <div className="popup-actions">
              <button className="btn btn-secondary" onClick={() => setShowLoginWarning(false)}>
                Entendido, continuar así
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowLoginWarning(false);
                  setView('login'); // Redirect to login page
                }}
              >
                Ir a Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar 
        view={view} 
        setView={(v) => {
          if ((v === 'textear' || v === 'hablar' || v === 'caraacara') && !token && !hasSeenLoginWarning) {
            setShowLoginWarning(true);
            setHasSeenLoginWarning(true);
          }
          setView(v);
        }} 
        userName={userName}
        handleLogout={handleLogout}
      />

      <div className="view-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        {view === 'inicio' && <Inicio setView={setView} handleMouseMove={handleMouseMove} />}
        {view === 'textear' && <Textear grammar={grammar} handleMouseMove={handleMouseMove} />}
        {view === 'hablar' && <Speak setView={setView} handleMouseMove={handleMouseMove} />}
        {view === 'caraacara' && <CaraACara setView={setView} handleMouseMove={handleMouseMove} />}
        {view === 'login' && <Login setView={setView} handleMouseMove={handleMouseMove} handleLogin={handleLogin} />}
        {view === 'register' && <Register setView={setView} handleMouseMove={handleMouseMove} />}
      </div>

      <footer className="footer">
        LOCALHOST WEB APP • POWERED BY FLASK &amp; GEMINI AI
      </footer>
    </>
  );
}

export default App;
