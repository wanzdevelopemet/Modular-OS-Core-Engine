import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoreAuth } from '@modular-os/bridge';
import { UniversalModuleLoader } from '../components/UniversalModuleLoader';
import { Sliders } from 'lucide-react';

/**
 * Helper: Kiểm tra người dùng hiện tại có vai trò SUPER_ADMIN từ JWT token payload
 */
function isCurrentUserSuperAdmin() {
  const token = CoreAuth.getToken();
  if (!token) return false;

  try {
    const parts = token.split('.');
    if (parts.length < 2) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);

    // Kiểm tra thời hạn hiệu lực của Token
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return false;
    }

    // So khớp vai trò SUPER_ADMIN (không phân biệt chữ hoa chữ thường)
    const role = (decoded.role || decoded.global_role || decoded.globalRole || '').toString().trim().toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
  } catch (err) {
    console.error('[DelegatedModuleLayout] Không thể giải mã JWT:', err);
    return false;
  }
}

/**
 * DelegatedModuleLayout: Layout vô hình cho Module vệ tinh được ủy quyền Trang chủ (/)
 * 
 * - Hoàn toàn trong suốt/vô hình với người dùng cuối: không Header, không Footer, không viền.
 * - Module chiếm trọn 100% viewport (full width/height).
 * - Nút Floating Action Button (FAB) "Back to Core" ở góc dưới phải CHỈ hiển thị nếu user là SUPER_ADMIN.
 * - Người dùng phổ thông xem module như một trang web độc lập bình thường.
 */
export function DelegatedModuleLayout({ moduleConfig }) {
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => isCurrentUserSuperAdmin());
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthChange = () => {
      setIsSuperAdmin(isCurrentUserSuperAdmin());
    };

    window.addEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  if (!moduleConfig) return null;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        background: '#030712'
      }}
    >
      {/* 1. Module vệ tinh chiếm 100% Viewport */}
      <UniversalModuleLoader moduleConfig={moduleConfig} fullscreen={true} />

      {/* 2. Hidden "Back to Core" FAB (Dành riêng cho SUPER_ADMIN) */}
      {isSuperAdmin && (
        <div
          id="delegated-admin-fab"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'auto'
          }}
        >
          <button
            onClick={() => navigate('/admin')}
            title="Quay lại Bảng Quản Trị Lõi (/admin)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem',
              letterSpacing: '0.01em',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7), 0 0 20px rgba(99, 102, 241, 0.45)',
              backdropFilter: 'blur(16px)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Sliders size={16} />
            <span className="fab-admin-text">Về Quản Trị Lõi (/admin)</span>
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          #delegated-admin-fab {
            bottom: 16px !important;
            right: 16px !important;
          }
          .fab-admin-text {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default DelegatedModuleLayout;

