import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CoreAuth } from '@modular-os/bridge';
import { NotificationBell } from '../../../extensions/notification-center/frontend/NotificationBell.jsx';
import { Box, Sliders, LogIn, LogOut, User, LayoutGrid, ExternalLink } from 'lucide-react';

/**
 * Header: Thanh điều hướng trung tâm của Host Shell
 * Tích hợp NotificationBell từ Notification Center và trạng thái định danh CAMS.
 */
export function Header() {
  const [currentUser, setCurrentUser] = useState(CoreAuth.getUser());
  const location = useLocation();

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(CoreAuth.getUser());
    };
    window.addEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
    return () => window.removeEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
  }, []);

  const handleLogout = () => {
    CoreAuth.clearToken();
  };

  const isHubActive = location.pathname === '/admin/hub' || location.pathname === '/portal';
  const isRegistryActive = location.pathname === '/admin/registry' || location.pathname === '/admin' || location.pathname === '/core-admin';

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(3, 7, 18, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '0.75rem 2rem'
    }}>
      <div style={{
        maxWidth: '1300px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Logo & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/admin/hub" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }} title="Về Cổng Tổng Admin">
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
            }}>
              <Box size={20} color="#ffffff" />
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc' }}>
              Modular<span style={{ color: '#818cf8' }}>OS</span>
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link
              to="/admin/hub"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: isHubActive ? '#ffffff' : '#94a3b8',
                background: isHubActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                transition: 'all 0.15s'
              }}
            >
              <LayoutGrid size={15} /> Cổng Tổng / Hub
            </Link>

            <Link
              to="/admin/registry"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: isRegistryActive ? '#ffffff' : '#94a3b8',
                background: isRegistryActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                transition: 'all 0.15s'
              }}
            >
              <Sliders size={15} /> Quản Trị Lõi
            </Link>

            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.8rem',
                fontWeight: '500',
                color: '#64748b',
                transition: 'color 0.15s'
              }}
              title="Xem Trang Chủ Công Khai (/)"
            >
              <ExternalLink size={13} /> Trang Chủ (/)
            </Link>
          </nav>
        </div>

        {/* Right Corner: Notification Center & User Auth Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Extension: Notification Center Hook */}
          <NotificationBell />

          <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.1)' }} />

          {/* CAMS User Profile */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                  src={currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=User'}
                  alt={currentUser.displayName}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)'
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#f1f5f9', lineHeight: 1.2 }}>
                    {currentUser.displayName}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#818cf8', textTransform: 'uppercase', fontWeight: '700' }}>
                    {currentUser.globalRole}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Đăng xuất"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => CoreAuth.requireLogin()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 1rem',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
            >
              <LogIn size={15} /> Đăng Nhập CAMS
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

