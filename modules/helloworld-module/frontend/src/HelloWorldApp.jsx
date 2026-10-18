import React, { useState, useEffect } from 'react';
import { CoreAuth, CoreBridge } from '@modular-os/bridge';
import { 
  Sparkles, 
  Send, 
  Radio, 
  Key, 
  ShieldCheck, 
  User, 
  LogIn, 
  LogOut, 
  Activity, 
  Clock, 
  CheckCircle2, 
  Info,
  Terminal,
  Layers
} from 'lucide-react';

const MODULE_ID = 'helloworld-module';
const SECRET_KEY = 'helloworld_super_secret_key_2026';

export function HelloWorldApp() {
  const [currentUser, setCurrentUser] = useState(CoreAuth.getUser());
  const [pingMessage, setPingMessage] = useState('Xin chào từ HelloWorld Starter Module!');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [eventsFeed, setEventsFeed] = useState([
    {
      id: 'init-1',
      event: 'SYSTEM_BOOT',
      source: 'kernel',
      payload: { message: 'HelloWorld Module initialized successfully.' },
      timestamp: new Date().toISOString()
    }
  ]);

  // 1. LẮNG NGHE THAY ĐỔI TRẠNG THÁI XÁC THỰC CAMS SSO
  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(CoreAuth.getUser());
    };

    window.addEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
    return () => window.removeEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
  }, []);

  // 2. LẮNG NGHE SỰ KIỆN TỪ ANTI-MESH EVENT BUS
  useEffect(() => {
    const handleEvent = (eventName, data) => {
      setEventsFeed((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          event: eventName,
          source: data?.source || 'redis-event-bus',
          payload: data?.payload || data,
          timestamp: new Date().toISOString()
        },
        ...prev.slice(0, 19) // Giữ tối đa 20 logs mới nhất
      ]);
    };

    // Lắng nghe sự kiện của chính mình và các module lân cận
    const unsubPing = CoreBridge.on('HELLOWORLD_PING', (d) => handleEvent('HELLOWORLD_PING', d));
    const unsubShop = CoreBridge.on('SHOP_VIP_BOUGHT', (d) => handleEvent('SHOP_VIP_BOUGHT', d));
    const unsubUser = CoreBridge.on('USER_PROFILE_UPDATED', (d) => handleEvent('USER_PROFILE_UPDATED', d));

    return () => {
      unsubPing();
      unsubShop();
      unsubUser();
    };
  }, []);

  // 3. BẮN SỰ KIỆN LÊN CORE GATEWAY (Chữ ký HMAC Zero-Trust)
  const handleSendPing = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setFeedback(null);

    const payload = {
      message: pingMessage,
      sender_user_id: currentUser ? currentUser.id : 'guest',
      sender_name: currentUser ? currentUser.displayName : 'Guest Developer',
      timestamp: Date.now()
    };

    try {
      await CoreBridge.emit('HELLOWORLD_PING', payload, SECRET_KEY, MODULE_ID);
      setFeedback({
        type: 'success',
        text: 'Đã gửi thành công sự kiện [HELLOWORLD_PING] qua Core Gateway với chữ ký HMAC-SHA256!'
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: 'Lỗi phát sự kiện: ' + err.message
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      padding: '1.5rem',
      maxWidth: '1200px',
      margin: '0 auto',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '20px',
        padding: '1.75rem 2rem',
        marginBottom: '1.5rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.65rem',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#a5b4fc'
            }}>
              <Sparkles size={13} /> Starter Template v1.0.0-rc
            </span>
            <span style={{
              padding: '0.25rem 0.65rem',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#34d399'
            }}>
              Anti-Mesh Active
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
            👋 HelloWorld Module Template
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.4rem 0 0 0' }}>
            Module mẫu chuẩn minh họa cách nạp UI qua Ngàm Cắm, xác thực CAMS SSO và giao tiếp Anti-Mesh qua Event Bus.
          </p>
        </div>

        {/* CAMS SSO Profile Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {currentUser ? (
            <>
              <img
                src={currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Modular'}
                alt={currentUser.displayName}
                style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #6366f1' }}
              />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#f8fafc' }}>
                  {currentUser.displayName}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <ShieldCheck size={12} /> {currentUser.globalRole}
                </div>
              </div>
              <button
                onClick={() => CoreAuth.clearToken()}
                title="Đăng xuất CAMS"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '8px',
                  padding: '0.45rem 0.65rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                <LogOut size={13} /> Thoát
              </button>
            </>
          ) : (
            <>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="#94a3b8" />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#cbd5e1' }}>Khách (Chưa đăng nhập)</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>CAMS SSO Sẵn sàng</div>
              </div>
              <button
                onClick={() => CoreAuth.requireLogin()}
                style={{
                  background: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: '700'
                }}
              >
                <LogIn size={13} /> Đăng Nhập
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.875rem',
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: feedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          color: feedback.type === 'success' ? '#34d399' : '#f87171'
        }}>
          <CheckCircle2 size={16} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Event Emitter & Security Handshake */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Card 1: Phát sự kiện lên Event Bus */}
          <div style={{
            background: 'rgba(17, 24, 39, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.5rem',
            backdropFilter: 'blur(12px)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={18} style={{ color: '#818cf8' }} /> Phát Sự Kiện (Anti-Mesh Event Emitter)
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
              Gửi thông điệp vào Redis Event Bus qua Gateway lõi. Yêu cầu ký chữ ký số HMAC-SHA256 với Secret Key.
            </p>

            <form onSubmit={handleSendPing}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Nội dung thông điệp payload:
                </label>
                <input
                  type="text"
                  required
                  value={pingMessage}
                  onChange={(e) => setPingMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Send size={15} />
                {isSending ? 'Đang gửi & ký HMAC...' : 'Bắn sự kiện [HELLOWORLD_PING]'}
              </button>
            </form>
          </div>

          {/* Card 2: Zero-Trust Security Inspector */}
          <div style={{
            background: 'rgba(17, 24, 39, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.5rem',
            backdropFilter: 'blur(12px)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={18} style={{ color: '#10b981' }} /> Thẩm Định Khóa Ký Số (Zero-Trust Inspector)
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.825rem', marginBottom: '1rem' }}>
              Thông số định danh được cấp phát trong <code>modules_registry</code> của Lõi.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8' }}>X-Module-ID:</span>
                <code style={{ color: '#818cf8', fontWeight: '700' }}>{MODULE_ID}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8' }}>HMAC Secret:</span>
                <code style={{ color: '#fbbf24', fontWeight: '700' }}>{SECRET_KEY}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px' }}>
                <span style={{ color: '#94a3b8' }}>Chống Replay:</span>
                <span style={{ color: '#34d399', fontWeight: '700' }}>Cửa sổ timestamp ≤ 300s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Event Stream Feed */}
        <div style={{
          background: 'rgba(17, 24, 39, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '1.5rem',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} className="animate-pulse" style={{ color: '#10b981' }} /> Realtime Event Stream
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Lắng nghe @modular-os/bridge</span>
          </div>

          <div style={{
            flex: 1,
            maxHeight: '480px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {eventsFeed.map((ev) => (
              <div
                key={ev.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{
                    fontWeight: '700',
                    fontFamily: 'monospace',
                    color: ev.event === 'HELLOWORLD_PING' ? '#818cf8' :
                           ev.event === 'SHOP_VIP_BOUGHT' ? '#f59e0b' : '#34d399'
                  }}>
                    {ev.event}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={11} /> {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Nguồn: <code style={{ color: '#cbd5e1' }}>{ev.source}</code>
                </div>

                <pre style={{
                  margin: 0,
                  padding: '0.5rem',
                  background: 'rgba(3, 7, 18, 0.7)',
                  borderRadius: '6px',
                  color: '#a7f3d0',
                  fontSize: '0.725rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto'
                }}>
                  {JSON.stringify(ev.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

