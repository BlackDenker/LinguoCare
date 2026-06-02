import React, { useState } from 'react';

export default function CreateAdmin({ handleMouseMove, token, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const validate = () => {
    if (!name.trim()) { setError('El nombre es obligatorio.'); setErrorField('name'); return false; }
    if (!email.trim()) { setError('El correo es obligatorio.'); setErrorField('email'); return false; }
    if (!email.toLowerCase().endsWith('@admin.com')) {
      setError('El correo debe terminar en @admin.com.');
      setErrorField('email');
      return false;
    }
    if (!birthdate) { setError('La fecha de nacimiento es obligatoria.'); setErrorField('birthdate'); return false; }
    if (!password) { setError('La contraseña es obligatoria.'); setErrorField('password'); return false; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); setErrorField('password'); return false; }

    // Age check (>= 18)
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) {
      setError('El administrador debe ser mayor de 18 años.');
      setErrorField('birthdate');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorField('');
    setSuccessMsg('');

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password, birthdate }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(`✅ Administrador "${name}" creado exitosamente.`);
        setName(''); setEmail(''); setPassword(''); setBirthdate('');
        if (onSuccess) onSuccess();
      } else {
        setError(data.message || 'Error al crear el administrador.');
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
    <div className="popup-overlay create-admin-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="popup-card create-admin-card" onMouseMove={handleMouseMove}>

        {/* Header */}
        <div className="create-admin-header">
          <div className="admin-shield-icon" style={{ fontSize: '2.5rem' }}>🛡️</div>
          <h2 className="create-admin-title">Crear Administrador</h2>
          <p className="create-admin-subtitle">
            Solo los administradores pueden crear nuevas cuentas admin · correo @admin.com obligatorio
          </p>
          <button className="close-modal-btn" onClick={onClose} title="Cerrar">✕</button>
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="admin-success-banner">
            {successMsg}
          </div>
        )}

        {/* General error */}
        {error && errorField === 'general' && (
          <div className="admin-error-banner">
            <span>⚠️</span> {error}
          </div>
        )}

        <form className="create-admin-form" noValidate>
          {/* Name */}
          <div className="input-group">
            <label htmlFor="ca-name">Nombre completo</label>
            <input
              type="text"
              id="ca-name"
              className={`custom-input admin-input${errorField === 'name' ? ' input-error' : ''}`}
              placeholder="Nombre del admin"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errorField === 'name') { setError(''); setErrorField(''); } }}
            />
            {error && errorField === 'name' && (
              <span className="field-error"><span className="field-error-icon">⚠️</span>{error}</span>
            )}
          </div>

          {/* Email */}
          <div className="input-group">
            <label htmlFor="ca-email">Correo Electrónico <span className="admin-domain-hint">(@admin.com)</span></label>
            <input
              type="text"
              id="ca-email"
              className={`custom-input admin-input${errorField === 'email' ? ' input-error' : ''}`}
              placeholder="nombre@admin.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errorField === 'email') { setError(''); setErrorField(''); } }}
            />
            {error && errorField === 'email' && (
              <span className="field-error"><span className="field-error-icon">⚠️</span>{error}</span>
            )}
          </div>

          {/* Birthdate */}
          <div className="input-group">
            <label htmlFor="ca-birthdate">Fecha de Nacimiento <span className="admin-domain-hint">(mayor de 18 años)</span></label>
            <input
              type="date"
              id="ca-birthdate"
              className={`custom-input admin-input${errorField === 'birthdate' ? ' input-error' : ''}`}
              value={birthdate}
              onChange={(e) => { setBirthdate(e.target.value); if (errorField === 'birthdate') { setError(''); setErrorField(''); } }}
            />
            {error && errorField === 'birthdate' && (
              <span className="field-error"><span className="field-error-icon">⚠️</span>{error}</span>
            )}
          </div>

          {/* Password */}
          <div className="input-group">
            <label htmlFor="ca-password">Contraseña</label>
            <input
              type="password"
              id="ca-password"
              autoComplete="new-password"
              className={`custom-input admin-input${errorField === 'password' ? ' input-error' : ''}`}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errorField === 'password') { setError(''); setErrorField(''); } }}
            />
            {error && errorField === 'password' && (
              <span className="field-error"><span className="field-error-icon">⚠️</span>{error}</span>
            )}
          </div>

          <div className="create-admin-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button
              type="button"
              id="create-admin-submit-btn"
              className="btn admin-login-submit-btn"
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'CREANDO...' : '🛡️ CREAR ADMIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
