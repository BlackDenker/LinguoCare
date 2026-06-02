import React, { useState } from 'react';

export default function Login({ setView, handleMouseMove, handleLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState(''); // 'email' | 'password' | 'general'
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorField('');

    if (!email.trim() && !password) {
      setError('Por favor, completa todos los campos.');
      setErrorField('email');
      return;
    }

    if (!email.trim()) {
      setError('Por favor, ingresa tu correo electrónico.');
      setErrorField('email');
      return;
    }

    if (!password) {
      setError('Por favor, ingresa tu contraseña.');
      setErrorField('password');
      return;
    }

    if (!email.includes('@')) {
      setError('Ingresa una dirección de correo válida que incluya "@".');
      setErrorField('email');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        handleLogin(data.token, data.email, data.role);
        if (data.role === 'admin') {
          setView('admin-panel');
        } else {
          setView('inicio');
        }
      } else {
        setError(data.message || 'Error al iniciar sesión');
        setErrorField('general');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      <main className="card login-form-card" onMouseMove={handleMouseMove}>
        <div className="login-header">
          <div className="popup-icon-wrapper" style={{ margin: '0 auto 1rem auto' }}>
            <span className="popup-icon">👤</span>
          </div>
          <h2 className="login-title">Iniciar Sesión</h2>
          <p className="login-subtitle">Bienvenido de vuelta a LinguoCare</p>
        </div>

        <form className="login-form" noValidate>
          <div className="input-group">
            <label htmlFor="login-user">Correo Electrónico</label>
            <input 
              type="text" 
              id="login-user"
              name="login-user"
              autoComplete="off"
              className={`custom-input${errorField === 'email' ? ' input-error' : ''}`}
              placeholder="tu@correo.com" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errorField === 'email') { setError(''); setErrorField(''); } }}
            />
            {(error && (errorField === 'email' || errorField === 'general')) && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="login-pass">Contraseña</label>
            <input 
              type="password" 
              id="login-pass"
              name="login-pass"
              autoComplete="new-password"
              className={`custom-input${errorField === 'password' ? ' input-error' : ''}`}
              placeholder="••••••••" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errorField === 'password') { setError(''); setErrorField(''); } }}
            />
            {(error && errorField === 'password') && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          <button type="button" className="btn btn-primary login-submit-btn" disabled={loading} onClick={handleSubmit}>
            {loading ? 'INGRESANDO...' : 'INGRESAR'}
          </button>
        </form>

        <div className="login-footer">
          <p>¿No tienes una cuenta? <span className="register-link" onClick={() => setView('register')}>Regístrate aquí</span></p>
          <span className="admin-portal-link" onClick={() => setView('admin-login')}>
            🛡️ Portal Administrativo
          </span>
        </div>
      </main>
    </div>
  );
}
