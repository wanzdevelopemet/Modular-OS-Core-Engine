import React, { useState } from 'react';
import { CoreAuth } from '@modular-os/bridge';
import { ShoppingBag, Award, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

/**
 * ShopApp: Giao diện Cửa Hàng Trực Tuyến (React Micro-Frontend)
 * Minh chứng triết lý Anti-Mesh:
 * Khi mua huy hiệu, Shop Module trừ tiền và phát tán sự kiện 'SHOP_VIP_BOUGHT' lên Redis Event Bus.
 * Shop hoàn toàn không biết Diễn đàn (Forum) nằm ở đâu.
 */
export function ShopApp() {
  const [selectedBadge, setSelectedBadge] = useState('VANG');
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [currentUser, setCurrentUser] = useState(CoreAuth.getUser());

  const badges = [
    {
      id: 'VANG',
      name: 'Huy Hiệu Vàng (Gold)',
      price: 99000,
      color: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.4)',
      bg: 'rgba(245, 158, 11, 0.1)',
      desc: 'Hiển thị huy hiệu Vàng lấp lánh trên toàn bộ diễn đàn cộng đồng.'
    },
    {
      id: 'KIM_CUONG',
      name: 'Huy Hiệu Kim Cương (Diamond)',
      price: 299000,
      color: '#38bdf8',
      border: 'rgba(56, 189, 248, 0.4)',
      bg: 'rgba(56, 189, 248, 0.1)',
      desc: 'Đặc quyền biểu tượng Diamond độc quyền trên các bài viết và hồ sơ.'
    },
    {
      id: 'VIP_PRO',
      name: 'Huy Hiệu Huyền Thoại (Mythic)',
      price: 599000,
      color: '#ec4899',
      border: 'rgba(236, 72, 153, 0.4)',
      bg: 'rgba(236, 72, 153, 0.1)',
      desc: 'Quyền năng tối cao, phát hào quang toàn hệ sinh thái khi trực tuyến.'
    }
  ];

  const handleBuyBadge = async () => {
    // 1. Kiểm tra xác thực qua CAMS Core
    const token = CoreAuth.getToken();
    if (!token) {
      CoreAuth.requireLogin();
      return;
    }

    setIsProcessing(true);
    setPurchaseResult(null);

    const activeItem = badges.find(b => b.id === selectedBadge);

    try {
      // 2. Gọi API Backend riêng của Shop Module (Port 4001)
      const res = await fetch('http://localhost:4001/api/buy-vip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          badge: selectedBadge,
          price: activeItem.price,
          userId: currentUser?.id || 123
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi thanh toán vật phẩm.');
      }

      setPurchaseResult(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'inherit' }}>
      {/* Module Title Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.75rem',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '999px',
            color: '#fbbf24',
            fontSize: '0.75rem',
            fontWeight: '700',
            marginBottom: '0.75rem'
          }}>
            <ShoppingBag size={14} /> Shop Vệ Tinh • Micro-Frontend React
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            Cửa Hàng Vật Phẩm & Danh Hiệu VIP
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, maxWidth: '520px' }}>
            Mua danh hiệu để nâng cấp tài khoản của bạn. Mọi thay đổi sẽ lập tức được phát tán bất đồng bộ qua <strong>Redis Event Bus</strong> đến Diễn đàn cộng đồng.
          </p>
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          textAlign: 'right'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Người dùng hiện tại</span>
          <strong style={{ color: '#f1f5f9', fontSize: '0.95rem' }}>{currentUser?.displayName || 'User #123'}</strong>
        </div>
      </div>

      {/* Grid Badges List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {badges.map((b) => {
          const isSelected = selectedBadge === b.id;
          return (
            <div
              key={b.id}
              onClick={() => setSelectedBadge(b.id)}
              style={{
                background: isSelected ? b.bg : 'rgba(17, 24, 39, 0.7)',
                border: `2px solid ${isSelected ? b.color : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '16px',
                padding: '1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isSelected ? 'scale(1.02)' : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: b.color
                }}>
                  <Award size={24} />
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                  {b.price.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem' }}>
                {b.name}
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
                {b.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Nút Kích Hoạt Mua */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <button
          onClick={handleBuyBadge}
          disabled={isProcessing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.9rem 2.5rem',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
            transition: 'all 0.2s'
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Đang xử lý giao dịch & Ký số HMAC...
            </>
          ) : (
            <>
              <Sparkles size={20} /> MUA HUY HIỆU VIP NGAY
            </>
          )}
        </button>
      </div>

      {/* Hiển thị Kết quả & Chứng minh Anti-Mesh */}
      {purchaseResult && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px',
          padding: '1.75rem',
          backdropFilter: 'blur(12px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#34d399', marginBottom: '0.75rem' }}>
            <CheckCircle2 size={24} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>Giao Dịch Thành Công & Event Bus Đã Phát</h3>
          </div>

          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1rem' }}>
            {purchaseResult.message}
          </p>

          <div style={{
            background: 'rgba(3, 7, 18, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: '#a7f3d0'
          }}>
            <div>// Payload sự kiện đã bắn lên Core Gateway:</div>
            <div>Tên Event: <strong style={{ color: '#fbbf24' }}>{purchaseResult.eventDispatched}</strong></div>
            <pre style={{ margin: '0.5rem 0 0', color: '#e2e8f0' }}>
              {JSON.stringify(purchaseResult.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopApp;

