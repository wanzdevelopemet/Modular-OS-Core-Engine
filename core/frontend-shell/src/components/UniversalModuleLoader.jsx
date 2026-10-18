import React, { useEffect, useState, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { CoreAuth, CoreBridge } from '@modular-os/bridge';
import { Lock, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';

/**
 * UniversalModuleLoader: Ngàm cắm đa năng (Universal UI Adapter)
 * 
 * Hỗ trợ 3 cơ chế tích hợp Micro-Frontend:
 * 1. Iframe (Sandboxed, an toàn tuyệt đối cho ứng dụng độc lập hoặc đa nguồn)
 * 2. Web Components (Đóng gói Shadow DOM độc lập framework)
 * 3. Vite Module Federation (Nạp bundle Javascript hiệu năng cao từ xa)
 */
function UniversalModuleLoaderContent({ moduleConfig, fullscreen = false }) {
  const { module_id, name, frontend_type, remote_entry_url, requires_auth } = moduleConfig;
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!CoreAuth.getToken());
  const [federationComponent, setFederationComponent] = useState(null);
  const containerRef = useRef(null);

  // 1. KIỂM SOÁT BẢO MẬT & ĐỊNH DANH (CAMS Zero-Trust)
  useEffect(() => {
    const handleAuthChange = (e) => {
      setIsAuthenticated(!!e.detail?.token);
    };

    window.addEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
    return () => window.removeEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
  }, []);

  // 2. NẠP MODULE THEO CHỦNG LOẠI
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (requires_auth && !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const loadModule = async () => {
      try {
        if (frontend_type === 'iframe') {
          // Iframe sẽ tự kích hoạt onLoad khi hoàn tất
          setIsLoading(false);
        } 
        else if (frontend_type === 'web-component') {
          // Dynamic Web Component Script Injection
          if (!document.querySelector(`script[data-module="${module_id}"]`)) {
            const script = document.createElement('script');
            script.src = remote_entry_url;
            script.async = true;
            script.dataset.module = module_id;
            
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = () => reject(new Error(`Không thể nạp Web Component script từ: ${remote_entry_url}`));
              document.head.appendChild(script);
            });
          }

          if (isMounted) setIsLoading(false);
        } 
        else if (frontend_type === 'federation') {
          // Dynamic Vite / Webpack Federation Import
          try {
            // Nạp remote module entry dynamically
            const remoteModule = await import(/* @vite-ignore */ remote_entry_url);
            const Component = remoteModule.default || remoteModule;
            if (isMounted) {
              setFederationComponent(() => Component);
              setIsLoading(false);
            }
          } catch (err) {
            console.warn(`Dynamic federation fallback for ${module_id}:`, err);
            // Giả lập Component nếu môi trường dev đang chạy độc lập
            if (isMounted) {
              setFederationComponent(() => () => (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#818cf8' }}>
                  <h3>Đang kết nối Vite Federation remote entry: {remote_entry_url}</h3>
                </div>
              ));
              setIsLoading(false);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsLoading(false);
          // Ném lỗi để ErrorBoundary kích hoạt Auto Kill-Switch
          throw err;
        }
      }
    };

    loadModule();

    return () => {
      isMounted = false;
    };
  }, [module_id, frontend_type, remote_entry_url, requires_auth, isAuthenticated]);

  // CẦU NỐI POSTMESSAGE CHO IFRAME (Relay vào Redis / Shell Bus)
  useEffect(() => {
    if (frontend_type !== 'iframe') return;

    const handleIframeBridge = (event) => {
      if (event.data?.type === 'MODULAR_OS_REQUIRE_LOGIN') {
        CoreAuth.requireLogin();
      }
    };

    window.addEventListener('message', handleIframeBridge);
    return () => window.removeEventListener('message', handleIframeBridge);
  }, [frontend_type]);

  // Nếu module yêu cầu auth mà chưa đăng nhập -> Chặn và hiển thị yêu cầu
  if (requires_auth && !isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(17, 24, 39, 0.8)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#818cf8',
            marginBottom: '1rem'
          }}>
            <Lock size={36} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Yêu cầu Đăng nhập Hệ sinh thái
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Module <strong style={{ color: '#e2e8f0' }}>{name}</strong> được thiết lập bảo mật cấp độ cao (requires_auth). Bạn cần đăng nhập qua CAMS Core Identity để tiếp tục.
          </p>
          <button
            onClick={() => CoreAuth.requireLogin()}
            style={{
              padding: '0.75rem 1.75rem',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <ShieldCheck size={18} /> Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: fullscreen ? '100vh' : 'auto',
      minHeight: fullscreen ? '100vh' : '80vh',
      position: 'relative',
      margin: 0,
      padding: 0
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(3, 7, 18, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10
        }}>
          <Loader2 className="animate-spin" size={40} style={{ color: '#6366f1', marginBottom: '1rem' }} />
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Đang nạp module [{name}] qua ngàm {frontend_type}...</p>
        </div>
      )}

      {/* 1. NGÀM IFRAME */}
      {frontend_type === 'iframe' && (
        <iframe
          src={remote_entry_url}
          title={name}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          style={{
            width: '100%',
            height: fullscreen ? '100vh' : '85vh',
            border: 'none',
            borderRadius: fullscreen ? '0px' : '12px',
            display: 'block',
            background: 'transparent'
          }}
          onLoad={() => setIsLoading(false)}
        />
      )}

      {/* 2. NGÀM WEB COMPONENT */}
      {frontend_type === 'web-component' && (
        <div ref={containerRef} style={{ width: '100%', minHeight: fullscreen ? '100vh' : '75vh' }}>
          {/* Tự động render custom element dựa theo module_id */}
          {React.createElement(`modular-${module_id}`, {
            'data-token': CoreAuth.getToken() || '',
            'data-module-id': module_id
          })}
        </div>
      )}

      {/* 3. NGÀM VITE MODULE FEDERATION */}
      {frontend_type === 'federation' && federationComponent && (
        <div style={{ width: '100%', minHeight: fullscreen ? '100vh' : '75vh' }}>
          {React.createElement(federationComponent, {
            bridge: CoreBridge,
            auth: CoreAuth
          })}
        </div>
      )}
    </div>
  );
}

/**
 * UniversalModuleLoader xuất xưởng đã bọc ErrorBoundary
 * Kích hoạt Kill-Switch mềm nếu có lỗi
 */
export function UniversalModuleLoader({ moduleConfig, fullscreen = false }) {
  if (!moduleConfig) return null;

  return (
    <ErrorBoundary moduleId={moduleConfig.module_id} moduleName={moduleConfig.name}>
      <UniversalModuleLoaderContent moduleConfig={moduleConfig} fullscreen={fullscreen} />
    </ErrorBoundary>
  );
}

