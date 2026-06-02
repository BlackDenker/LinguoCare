import React, { useState, useEffect } from 'react';

export default function Navbar({ view, setView, userName, handleLogout }) {
  const [isNavbarHidden, setIsNavbarHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsNavbarHidden(true);
      } else {
        setIsNavbarHidden(false);
      }
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent background scrolling when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  const navigate = (destination) => {
    setView(destination);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className={`navbar ${isNavbarHidden ? 'hidden' : ''}`}>
        <div className="navbar-brand" onClick={() => navigate('inicio')}>
          <span>✨</span> LinguoCare
        </div>

        {/* Desktop links */}
        <div className="navbar-links navbar-desktop">
          <button 
            className={`navbar-btn ${view === 'inicio' ? 'active' : ''}`} 
            onClick={() => navigate('inicio')}
          >
            INICIO
          </button>
          <button 
            className={`navbar-btn ${view === 'textear' ? 'active' : ''}`} 
            onClick={() => navigate('textear')}
          >
            TEXTEAR
          </button>
          <button 
            className={`navbar-btn ${view === 'hablar' ? 'active' : ''}`} 
            onClick={() => navigate('hablar')}
          >
            HABLAR
          </button>
          <button 
            className={`navbar-btn ${view === 'caraacara' ? 'active' : ''}`} 
            onClick={() => navigate('caraacara')}
          >
            CARA A CARA
          </button>
          {userName && (
            <button 
              className={`navbar-btn ${view === 'historial' ? 'active' : ''}`} 
              onClick={() => navigate('historial')}
            >
              HISTORIAL
            </button>
          )}
          {userName ? (
            <div className="navbar-user-menu">
              <span className="navbar-user-email">{userName}</span>
              <button 
                className="navbar-btn icon-btn logout-btn"
                onClick={handleLogout}
                title="Cerrar Sesión"
              >
                <span className="icon-swap">
                  <svg className="icon-default" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                </span>
              </button>
            </div>
          ) : (
            <button 
              className={`navbar-btn icon-btn ${view === 'login' ? 'active' : ''}`}
              onClick={() => navigate('login')}
              title="Iniciar Sesión"
            >
              <span className="icon-swap">
                <svg className="icon-default" width="18" height="18" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="24" cy="13" rx="8" ry="9" />
                  <path d="M8 44 C8 32 16 28 24 28 C32 28 40 32 40 44" />
                </svg>
                <svg className="icon-hover" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 7.5C8 5.015 9.79 3 12 3s4 2.015 4 4.5c0 3-4 4-4 6" />
                  <circle cx="12" cy="20" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              </span>
            </button>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          className={`hamburger-btn ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menú"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      {/* Mobile fullscreen overlay menu */}
      <div className={`mobile-menu-overlay ${menuOpen ? 'open' : ''}`}>
        <button className="mobile-menu-close" onClick={() => setMenuOpen(false)}>✕</button>
        <nav className="mobile-menu-links">
          <button 
            className={`mobile-menu-btn ${view === 'inicio' ? 'active' : ''}`}
            onClick={() => navigate('inicio')}
          >
            INICIO
          </button>
          <button 
            className={`mobile-menu-btn ${view === 'textear' ? 'active' : ''}`}
            onClick={() => navigate('textear')}
          >
            TEXTEAR
          </button>
          <button 
            className={`mobile-menu-btn ${view === 'hablar' ? 'active' : ''}`}
            onClick={() => navigate('hablar')}
          >
            HABLAR
          </button>
          <button 
            className={`mobile-menu-btn ${view === 'caraacara' ? 'active' : ''}`}
            onClick={() => navigate('caraacara')}
          >
            CARA A CARA
          </button>
          {userName && (
            <button 
              className={`mobile-menu-btn ${view === 'historial' ? 'active' : ''}`}
              onClick={() => navigate('historial')}
            >
              HISTORIAL
            </button>
          )}
          {userName ? (
            <button 
              className="mobile-menu-btn"
              onClick={() => { handleLogout(); setMenuOpen(false); }}
            >
              CERRAR SESIÓN
            </button>
          ) : (
            <button 
              className={`mobile-menu-btn ${view === 'login' ? 'active' : ''}`}
              onClick={() => navigate('login')}
            >
              INICIAR SESIÓN
            </button>
          )}
        </nav>
      </div>
    </>
  );
}
