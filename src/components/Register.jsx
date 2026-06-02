import React, { useState } from 'react';

export default function Register({ setView, handleMouseMove }) {
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field) => {
    if (errorField === field) { setError(''); setErrorField(''); }
  };

  const handleSubmit = async () => {
    setError('');
    setErrorField('');

    if (!name.trim()) {
      setError('Por favor, ingresa tu nombre completo.');
      setErrorField('name');
      return;
    }
    if (!birthdate) {
      setError('Por favor, ingresa tu fecha de nacimiento.');
      setErrorField('birthdate');
      return;
    }
    if (!email.trim()) {
      setError('Por favor, ingresa tu correo electrónico.');
      setErrorField('email');
      return;
    }
    if (!email.includes('@')) {
      setError('Ingresa un correo válido con "@".');
      setErrorField('email');
      return;
    }
    if (!password) {
      setError('Por favor, ingresa una contraseña.');
      setErrorField('password');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      setErrorField('password');
      return;
    }
    if (!confirmPassword) {
      setError('Por favor, confirma tu contraseña.');
      setErrorField('confirmPassword');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setErrorField('confirmPassword');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, birthdate, email, password })
      });
      const data = await response.json();
      if (response.ok) {
        setView('login');
      } else {
        setError(data.message || 'Error al crear la cuenta.');
        setErrorField('general');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
      setErrorField('general');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-layout">
      <main className="card login-form-card" onMouseMove={handleMouseMove}>
        <div className="login-header">
          <div className="popup-icon-wrapper" style={{ margin: '0 auto 1rem auto' }}>
            <span className="popup-icon">📝</span>
          </div>
          <h2 className="login-title">Crear Cuenta</h2>
          <p className="login-subtitle">Únete a LinguoCare y guarda tu progreso</p>
        </div>

        {(error && errorField === 'general') && (
          <div className="field-error" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span className="field-error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form className="login-form" noValidate>
          {/* Nombre */}
          <div className="input-group">
            <label htmlFor="reg-fullname">Nombre Completo</label>
            <input
              type="text"
              id="reg-fullname"
              name="reg-fullname"
              autoComplete="off"
              className={`custom-input${errorField === 'name' ? ' input-error' : ''}`}
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
            />
            {(error && errorField === 'name') && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          {/* Fecha de Nacimiento */}
          <div className="input-group">
            <label htmlFor="reg-bdate">Fecha de Nacimiento</label>
            <input
              type="date"
              id="reg-bdate"
              name="reg-bdate"
              className={`custom-input${errorField === 'birthdate' ? ' input-error' : ''}`}
              value={birthdate}
              onChange={(e) => { setBirthdate(e.target.value); clearFieldError('birthdate'); }}
            />
            {(error && errorField === 'birthdate') && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          {/* Correo */}
          <div className="input-group">
            <label htmlFor="reg-user">Correo Electrónico</label>
            <input
              type="text"
              id="reg-user"
              name="reg-user"
              autoComplete="off"
              className={`custom-input${errorField === 'email' ? ' input-error' : ''}`}
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
            />
            {(error && errorField === 'email') && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          {/* Contraseña */}
          <div className="input-group">
            <label htmlFor="reg-pwd">Contraseña</label>
            <input
              type="password"
              id="reg-pwd"
              name="reg-pwd"
              autoComplete="new-password"
              className={`custom-input${errorField === 'password' ? ' input-error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
            />
            {(error && errorField === 'password') && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          {/* Confirmar Contraseña */}
          <div className="input-group">
            <label htmlFor="reg-confirm">Confirmar Contraseña</label>
            <input
              type="password"
              id="reg-confirm"
              name="reg-confirm"
              autoComplete="new-password"
              className={`custom-input${errorField === 'confirmPassword' ? ' input-error' : ''}`}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
            />
            {(error && errorField === 'confirmPassword') && (
              <span className="field-error">
                <span className="field-error-icon">⚠️</span>
                {error}
              </span>
            )}
          </div>

          <button type="button" className="btn btn-primary login-submit-btn" disabled={loading} onClick={handleSubmit}>
            {loading ? 'REGISTRANDO...' : 'REGISTRARME'}
          </button>
        </form>

        <div className="login-footer">
          <p>¿Ya tienes una cuenta? <span className="register-link" onClick={() => setView('login')}>Inicia sesión aquí</span></p>
        </div>
      </main>
    </div>
  );
}
