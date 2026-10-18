import React from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import { 
  Layers, 
  Shield, 
  ExternalLink, 
  Cpu, 
  LayoutGrid, 
  Radio, 
  Sparkles, 
  Home, 
  XCircle,
  PlusCircle,
  Sliders
} from 'lucide-react';

/**
 * PortalHome: Màn hình Cổng thông tin Tổng (Portal Grid View)
 */
export function PortalHome({ modules = [], defaultHomeModule = null, onRefresh }) {
  const handleUnsetHome = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.put(`/admin/modules/${id}/unset-home`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Thông báo nếu có module đang được set làm Trang chủ mặc định */}
      {defaultHomeModule && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '16px',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.25)',
              color: '#818cf8'
            }}>
              <Home size={18} />
            </span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f1f5f9' }}>
                Module [{defaultHomeModule.name}] đang chiếm quyền Trang chủ mặc định (/)
              </div>
              <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                Khách truy cập vào đường dẫn gốc (/) sẽ được chuyển tiếp trực tiếp vào module này.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                background: '#4f46e5',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              Mở Trang Chủ Ủy Quyền <ExternalLink size={14} />
            </Link>

            <button
              onClick={(e) => handleUnsetHome(e, defaultHomeModule.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <XCircle size={14} /> Hủy Ủy Quyền
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: '24px',
        padding: '2.5rem',
        marginBottom: '2.5rem',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40%',
          right: '-10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.85rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '999px', color: '#a5b4fc', fontSize: '0.8rem', fontWeight: '600', marginBottom: '1.25rem' }}>
          <Radio size={14} className="animate-pulse" /> Microkernel Core v1.0 • Anti-Mesh Architecture
        </div>

        <h1 style={{ fontSize: '2.25rem', fontWeight: '800', letterSpacing: '-0.025em', color: '#f8fafc', marginBottom: '0.75rem' }}>
          Trung tâm Ứng dụng & Dịch vụ Vệ tinh
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '650px', lineHeight: '1.6' }}>
          Mọi module bên dưới hoạt động độc lập, không kết nối lưới trực tiếp (Anti-Mesh) mà giao tiếp phi tập trung qua Redis Event Bus.
        </p>
      </div>

      {/* Grid Tiêu đề & Nút Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LayoutGrid size={20} style={{ color: '#818cf8' }} /> Các Module Đang Sẵn Sàng ({modules.length})
        </h2>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            to="/admin/registry"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '8px',
              color: '#a5b4fc',
              fontSize: '0.825rem',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            <Sliders size={15} /> Quản Trị Module & Extensions
          </Link>
        </div>
      </div>

      {/* Grid Modules */}
      {modules.length === 0 ? (
        <div style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '16px',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
          <Layers size={48} style={{ color: '#64748b', margin: '0 auto 1rem' }} />
          <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1rem' }}>
            Hiện chưa có module nào được kích hoạt trong Kernel Registry.
          </p>
          <Link
            to="/admin/registry"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              background: '#4f46e5',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}
          >
            <PlusCircle size={16} /> Thêm Module Mới vào Lõi
          </Link>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {modules.map((m) => (
            <Link
              key={m.id}
              to={`/m/${m.module_id}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block'
              }}
            >
              <div style={{
                background: 'rgba(17, 24, 39, 0.75)',
                border: m.is_default_home ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '1.75rem',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(99, 102, 241, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = m.is_default_home ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div style={{
                      padding: '12px',
                      borderRadius: '12px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: '#818cf8'
                    }}>
                      <Cpu size={24} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {m.is_default_home && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          Trang Chủ
                        </span>
                      )}

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: m.frontend_type === 'federation' ? 'rgba(56, 189, 248, 0.15)' :
                                    m.frontend_type === 'iframe' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                        color: m.frontend_type === 'federation' ? '#38bdf8' :
                               m.frontend_type === 'iframe' ? '#facc15' : '#c084fc',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        {m.frontend_type}
                      </span>

                      {m.requires_auth && (
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(244, 63, 94, 0.15)',
                          color: '#f43f5e',
                          border: '1px solid rgba(244, 63, 94, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.2rem'
                        }}>
                          <Shield size={10} /> CAMS
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.4rem' }}>
                    {m.name}
                  </h3>
                  <code style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    id: {m.module_id}
                  </code>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#818cf8',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  <span>Khởi chạy ứng dụng</span>
                  <ExternalLink size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
