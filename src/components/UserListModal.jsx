import React, { useState, useEffect } from 'react';

export default function UserListModal({ token, role, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`/api/admin/users?role=${role}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok) {
          setUsers(data.users);
        } else {
          setError(data.message || 'Error al cargar la lista');
        }
      } catch (err) {
        setError('Error de conexión al servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [token, role]);

  return (
    <div className="modal-overlay">
      <div className="modal-content admin-list-modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="modal-header">
          <h2>Lista de {role === 'admin' ? 'Administradores' : 'Usuarios Registrados'}</h2>
          <p>
            {role === 'admin' 
              ? 'Personal con acceso al sistema de gestión.' 
              : 'Usuarios estándar de la aplicación LinguoCare.'}
          </p>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="admin-list-loading">Cargando datos...</div>
          ) : error ? (
            <div className="field-error">
              <span className="field-error-icon">⚠️</span>
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="admin-list-empty">No se encontraron registros.</div>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo Electrónico</th>
                    <th>Fecha de Creación</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.created_at || 'Desconocida'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
