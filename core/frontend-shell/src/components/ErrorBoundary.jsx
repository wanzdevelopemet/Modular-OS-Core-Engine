import React from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

/**
 * ErrorBoundary (Auto Kill-Switch & Fault Isolation):
 * 
 * Đảm bảo sự cố từ một Micro-Frontend không làm crash toàn bộ Host Shell.
 * Nếu module con lỗi hoặc crash, tự động ngắt kết nối và hiển thị màn hình Bảo trì.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error(`[Modular-OS Auto Kill-Switch] Module [${this.props.moduleName || 'Unknown'}] đã bị cô lập:`, error, errorInfo);

    // Bắn sự kiện lên Shell thông báo module con crash
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('MODULAR_OS_MODULE_CRASHED', {
        detail: {
          moduleId: this.props.moduleId,
          moduleName: this.props.moduleName,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '65vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 20px 40px -15px rgba(239, 68, 68, 0.2)'
          }}>
            <div style={{
              display: 'inline-flex',
              padding: '16px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              marginBottom: '1.25rem'
            }}>
              <ShieldAlert size={48} />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f87171', marginBottom: '0.5rem' }}>
              Module Tạm Thời Gián Đoạn (Auto Kill-Switch)
            </h2>

            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Module <strong style={{ color: '#f1f5f9' }}>{this.props.moduleName || this.props.moduleId}</strong> gặp lỗi bất thường và đã được hệ thống tự động cách ly an toàn để bảo vệ toàn vẹn dữ liệu lõi.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.825rem',
                color: '#fca5a5',
                textAlign: 'left',
                fontFamily: 'monospace',
                overflowX: 'auto',
                marginBottom: '1.5rem'
              }}>
                <code>{this.state.error.toString()}</code>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <RefreshCw size={16} /> Thử tải lại
              </button>

              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  background: 'rgba(51, 65, 85, 0.8)',
                  color: '#e2e8f0',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}
              >
                <Home size={16} /> Về Trang Chủ
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

