import React, { useState } from 'react';

export default function AdminLogin({ setView, handleMouseMove, handleLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
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
      setError('Por favor, ingresa tu correo.');
      setErrorField('email');
      return;
    }
    if (!password) {
      setError('Por favor, ingresa tu contraseña.');
      setErrorField('password');
      return;
    }
    if (!email.toLowerCase().endsWith('@admin.com')) {
      setError('Solo correos @admin.com pueden acceder aquí.');
      setErrorField('email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.role === 'admin') {
        handleLogin(data.token, data.email, data.role);
        setView('admin-panel');
      } else if (response.ok && data.role !== 'admin') {
        setError('Esta cuenta no tiene permisos de administrador.');
        setErrorField('general');
      } else {
        setError(data.message || 'Credenciales inválidas');
        setErrorField('general');
      }
    } catch {
      setError('Error de conexión con el servidor.');
      setErrorField('general');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      <main className="card login-form-card admin-login-card" onMouseMove={handleMouseMove}>
        {/* Admin Badge */}
        <div className="admin-badge-header">
          <div className="admin-shield-icon">🛡️</div>
          <div className="admin-badge-label">PORTAL ADMINISTRATIVO</div>
        </div>

        <div className="login-header" style={{ marginTop: '1rem' }}>
          <h2 className="login-title admin-title">Acceso Admin</h2>
          <p className="login-subtitle">Solo personal autorizado · correo @admin.com</p>
        </div>

        <form className="login-form" noValidate>
          <div className="input-group">
            <label htmlFor="admin-login-email">Correo Electrónico</label>
            <input
              type="text"
              id="admin-login-email"
              name="admin-login-email"
              autoComplete="off"
              className={`custom-input admin-input${errorField === 'email' ? ' input-error' : ''}`}
              placeholder="nombre@admin.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errorField === 'email') { setError(''); setErrorField(''); }
              }}
            />
            {(error && (errorField === 'email' || errorField === 'general')) && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="admin-login-pass">Contraseña</label>
            <input
              type="password"
              id="admin-login-pass"
              name="admin-login-pass"
              autoComplete="new-password"
              className={`custom-input admin-input${errorField === 'password' ? ' input-error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorField === 'password') { setError(''); setErrorField(''); }
              }}
            />
            {(error && errorField === 'password') && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          <button
            type="button"
            id="admin-login-btn"
            className="btn admin-login-submit-btn"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'VERIFICANDO...' : '🔐 INGRESAR'}
          </button>
        </form>

        <div className="admin-login-footer">
          <span className="admin-back-link" onClick={() => setView('login')}>
            ← Volver al inicio de sesión normal
          </span>
        </div>
      </main>
    </div>
  );
}
