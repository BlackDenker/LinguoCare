import React, { useState, useEffect } from 'react';
import CreateAdmin from './CreateAdmin';
import UserListModal from './UserListModal';

export default function AdminPanel({ setView, handleMouseMove, handleLogout, token, userName }) {
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [listModalRole, setListModalRole] = useState(null); // 'user' | 'admin' | null
  const [stats, setStats] = useState({ userCount: 0, adminCount: 0, avgTimeMinutes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setStats({
            userCount: data.userCount,
            adminCount: data.adminCount,
            avgTimeMinutes: data.avgTimeMinutes
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [token]);

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-dashboard-header">
        <div style={{ display: 'inline-block', marginBottom: '1rem' }}>
          <div className="admin-shield-icon" style={{ fontSize: '4rem' }}>🛡️</div>
        </div>
        <h2 className="login-title admin-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Panel Administrativo</h2>
        <p className="login-subtitle" style={{ fontSize: '1.2rem' }}>
          Sesión activa como <strong style={{ color: '#a78bfa' }}>{userName}</strong>
        </p>
      </div>

      {/* Grid Dashboard */}
      <div className="admin-dashboard-grid">
        
        {/* Usuarios Registrados */}
        <div 
          className="admin-dashboard-card clickable" 
          onClick={() => setListModalRole('user')}
          title="Ver lista de usuarios"
        >
          <div className="admin-card-icon">👥</div>
          <h3 className="admin-card-title">Usuarios Registrados</h3>
          <div className="admin-card-value">
            {loadingStats ? '...' : stats.userCount}
          </div>
          <p className="admin-card-desc">
            Usuarios estándar de la aplicación LinguoCare. Haz click para ver el listado detallado.
          </p>
        </div>

        {/* Administradores */}
        <div 
          className="admin-dashboard-card clickable"
          onClick={() => setListModalRole('admin')}
          title="Ver lista de administradores"
        >
          <div className="admin-card-icon">🛡️</div>
          <h3 className="admin-card-title">Administradores</h3>
          <div className="admin-card-value" style={{ color: '#a78bfa' }}>
            {loadingStats ? '...' : stats.adminCount}
          </div>
          <p className="admin-card-desc">
            Personal con acceso de gestión al sistema. Haz click para ver el listado.
          </p>
        </div>

        {/* Tiempo Promedio */}
        <div className="admin-dashboard-card">
          <div className="admin-card-icon">⏱️</div>
          <h3 className="admin-card-title">Tiempo Promedio</h3>
          <div className="admin-card-value" style={{ color: '#34d399' }}>
            {loadingStats ? '...' : `${stats.avgTimeMinutes} min`}
          </div>
          <p className="admin-card-desc">
            Tiempo promedio de uso de la aplicación por usuario basado en el historial de actividades.
          </p>
        </div>

        {/* Crear Admin */}
        <div 
          className="admin-dashboard-card clickable"
          style={{ border: '1px dashed rgba(167, 139, 250, 0.4)' }}
          onClick={() => setShowCreateAdmin(true)}
        >
          <div className="admin-card-icon" style={{ background: 'transparent' }}>➕</div>
          <h3 className="admin-card-title">Crear Nuevo Administrador</h3>
          <p className="admin-card-desc" style={{ marginTop: '1rem' }}>
            Registra una nueva cuenta con permisos administrativos para gestionar el sistema.
          </p>
        </div>
      </div>

      {/* Logout */}
      <div style={{ textAlign: 'center', marginTop: '3rem' }}>
        <button
          className="btn btn-secondary"
          style={{ minWidth: '250px' }}
          onClick={() => { handleLogout(); setView('inicio'); }}
        >
          Cerrar Sesión Admin
        </button>
      </div>

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <CreateAdmin
          handleMouseMove={handleMouseMove}
          token={token}
          onClose={() => setShowCreateAdmin(false)}
          onSuccess={() => {
            // Refrescar estadísticas si se creó uno nuevo
            setLoadingStats(true);
            fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } })
              .then(res => res.json())
              .then(data => {
                if(data.status === 'success') {
                  setStats(s => ({ ...s, adminCount: data.adminCount }));
                }
                setLoadingStats(false);
              })
              .catch(() => setLoadingStats(false));
          }}
        />
      )}

      {/* User/Admin List Modal */}
      {listModalRole && (
        <UserListModal
          token={token}
          role={listModalRole}
          onClose={() => setListModalRole(null)}
        />
      )}
    </div>
  );
}
