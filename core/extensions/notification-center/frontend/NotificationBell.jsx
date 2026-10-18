import React, { useState, useEffect, useRef } from 'react';
import { CoreBridge } from '@modular-os/bridge';
import { api } from '../../../frontend-shell/src/api/apiClient';
import { Bell, CheckCheck, Sparkles, ShoppingBag, UserCheck, Info } from 'lucide-react';

/**
 * NotificationBell: Chuông thông báo thời gian thực tự động hook vào Header
 * 
 * Lắng nghe mọi sự kiện luân chuyển qua Event Bus để hiển thị cho người dùng:
 * - SHOP_VIP_BOUGHT (Sự kiện từ Shop Module)
 * - USER_PROFILE_UPDATED (Sự kiện từ CAMS)
 * - NOTIFICATION_SENT (Sự kiện từ Core)
 */
export function NotificationBell() {
  const [notifications, setNotifications] = useState([
    {
      id: 'init-1',
      title: 'Hệ sinh thái Modular-OS sẵn sàng',
      message: 'Hạt nhân Microkernel và Redis Event Bus đang hoạt động ổn định.',
      time: 'Vừa xong',
      type: 'info'
    }
  ]);
  const [unreadCount, setUnreadCount] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lấy thông báo lưu trong Redis từ Backend khi tải trang
  useEffect(() => {
    api.get('/extensions/notifications').then((res) => {
      if (res?.notifications && res.notifications.length > 0) {
        setNotifications(res.notifications);
        setUnreadCount(res.notifications.length);
      }
    }).catch(() => {});
  }, []);

  // LẮNG NGHE REALTIME EVENT BUS QUA COREBRIDGE
  useEffect(() => {
    // 1. Lắng nghe sự kiện mua hàng từ shop-module
    const unsubShop = CoreBridge.on('SHOP_VIP_BOUGHT', (payload) => {
      const newNoti = {
        id: Date.now().toString(),
        title: 'Giao dịch Shop Vệ tinh',
        message: `Người dùng #${payload.userId || '123'} vừa mua huy hiệu ${payload.badge || 'VIP'}!`,
        time: new Date().toLocaleTimeString(),
        type: 'shop'
      };
      setNotifications((prev) => [newNoti, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    // 2. Lắng nghe sự kiện cập nhật profile từ CAMS
    const unsubProfile = CoreBridge.on('USER_PROFILE_UPDATED', (payload) => {
      const newNoti = {
        id: Date.now().toString(),
        title: 'Hồ sơ CAMS cập nhật',
        message: `Tài khoản ${payload.display_name || payload.email} vừa cập nhật thông tin.`,
        time: new Date().toLocaleTimeString(),
        type: 'profile'
      };
      setNotifications((prev) => [newNoti, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    // 3. Lắng nghe thông báo hệ thống chung
    const unsubGeneral = CoreBridge.on('NOTIFICATION_SENT', (payload) => {
      const newNoti = {
        id: Date.now().toString(),
        title: payload.title || 'Thông báo hệ thống',
        message: payload.message || '',
        time: new Date().toLocaleTimeString(),
        type: payload.type || 'info'
      };
      setNotifications((prev) => [newNoti, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      unsubShop();
      unsubProfile();
      unsubGeneral();
    };
  }, []);

  const handleOpenDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'shop':
        return <ShoppingBag size={16} style={{ color: '#f59e0b' }} />;
      case 'profile':
        return <UserCheck size={16} style={{ color: '#10b981' }} />;
      default:
        return <Sparkles size={16} style={{ color: '#6366f1' }} />;
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Icon Chuông & Badge */}
      <button
        onClick={handleOpenDropdown}
        style={{
          position: 'relative',
          padding: '8px',
          borderRadius: '10px',
          background: isOpen ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#cbd5e1',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: '#ffffff',
            fontSize: '0.65rem',
            fontWeight: '800',
            borderRadius: '999px',
            minWidth: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 2px',
            boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '120%',
          right: 0,
          width: '340px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(15, 23, 42, 0.9)'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#f1f5f9' }}>
              Thông Báo Sự Kiện ({notifications.length})
            </h4>
            <button
              onClick={() => setNotifications([])}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem'
              }}
            >
              <CheckCheck size={14} /> Xóa hết
            </button>
          </div>

          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                Không có thông báo mới nào.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start'
                  }}
                >
                  <div style={{
                    padding: '6px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    marginTop: '2px'
                  }}>
                    {getIcon(n.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0' }}>{n.title}</span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{n.time}</span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.775rem', color: '#94a3b8', lineHeight: '1.4' }}>
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

