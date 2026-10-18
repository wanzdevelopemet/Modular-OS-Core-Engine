import React, { useState, useEffect } from 'react';
import { CoreAuth } from '@modular-os/bridge';
import { api } from '../../../frontend-shell/src/api/apiClient';
import { X, Lock, Mail, ShieldCheck, Loader2 } from 'lucide-react';

/**
 * GlobalLoginModal: Modal đăng nhập tập trung của CAMS
 * 
 * Tự động bật đè lên giao diện khi bất kỳ module con nào gọi:
 * CoreAuth.requireLogin()
 */
export function GlobalLoginModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('admin@modular-os.internal');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // 1. Lắng nghe CustomEvent từ Host Shell / Federation
    const handleOpenModal = () => {
      setErrorMessage('');
      setIsOpen(true);
    };

    // 2. Lắng nghe postMessage từ Iframe
    const handlePostMessage = (event) => {
      if (event.data?.type === 'MODULAR_OS_REQUIRE_LOGIN') {
        handleOpenModal();
      }
    };

    window.addEventListener('MODULAR_OS_REQUIRE_LOGIN', handleOpenModal);
    window.addEventListener('message', handlePostMessage);

    return () => {
      window.removeEventListener('MODULAR_OS_REQUIRE_LOGIN', handleOpenModal);
      window.removeEventListener('message', handlePostMessage);
    };
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await api.post('/extensions/cams/login', { email, password });

      if (!data.success) {
        throw new Error(data.message || 'Đăng nhập thất bại.');
      }

      // Lưu JWT Token qua SDK CoreAuth (tự động phát MODULAR_OS_AUTH_CHANGED)
      CoreAuth.setToken(data.token);

      // Đóng Modal thành công
      setIsOpen(false);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(3, 7, 18, 0.8)',
      backdropFilter: 'blur(8px)',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: '#0f172a',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '20px',
        padding: '2.25rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative'
      }}>
        {/* Nút đóng */}
        <button
          onClick={() => setIsOpen(false)}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#818cf8',
            marginBottom: '0.75rem'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
            Định Danh Lõi CAMS
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Hệ thống Quản lý Tài khoản Tập trung (Zero-Trust)
          </p>
        </div>

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            fontSize: '0.825rem',
            marginBottom: '1rem'
          }}>
            {errorMessage}
          </div>
        )}

        {/* Form Đăng nhập */}
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Email Người Dùng
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.7rem 0.9rem 0.7rem 2.4rem',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.875rem'
                }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '0.8rem', top: '0.85rem', color: '#64748b' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}>
              Mật Khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.7rem 0.9rem 0.7rem 2.4rem',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.875rem'
                }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.8rem', top: '0.85rem', color: '#64748b' }} />
            </div>
          </div>

          <div style={{
            fontSize: '0.75rem',
            color: '#64748b',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px'
          }}>
            Tài khoản Super Admin mặc định: <code style={{ color: '#a5b4fc' }}>admin@modular-os.internal</code> / pass: <code style={{ color: '#a5b4fc' }}>admin123</code>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              marginTop: '0.5rem'
            }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Xác Thực & Đăng Nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}

