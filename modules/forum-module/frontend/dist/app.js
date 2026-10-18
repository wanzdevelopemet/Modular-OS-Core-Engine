/**
 * app.js: Bộ lắng nghe sự kiện của Diễn Đàn Cộng Đồng (Forum Iframe)
 * 
 * NGUYÊN TẮC ANTI-MESH TUYỆT ĐỐI:
 * Module này hoàn toàn KHÔNG biết IP hay Domain của Shop Module.
 * Nó chỉ đăng ký lắng nghe sự kiện 'SHOP_VIP_BOUGHT' thông qua Event Bridge của Host Shell!
 */

let eventCounter = 0;

// Bộ Client Bridge thu nhỏ hoạt động bên trong Iframe
const ForumBridge = {
  listeners: {},

  on(eventName, callback) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(callback);
  },

  dispatch(eventName, payload) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach(cb => cb(payload));
    }
  }
};

// Lắng nghe thông điệp từ Host Shell gửi vào Iframe qua postMessage
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'MODULAR_OS_EVENT') {
    const { eventName, payload } = event.data;
    ForumBridge.dispatch(eventName, payload);
  }
});

// LẮNG NGHE SỰ KIỆN 'SHOP_VIP_BOUGHT' TỪ EVENT BUS
ForumBridge.on('SHOP_VIP_BOUGHT', (data) => {
  console.log('🎉 [FORUM ANTI-MESH] Nhận được event SHOP_VIP_BOUGHT từ Redis Event Bus:', data);

  eventCounter++;
  const countBadge = document.getElementById('event-count');
  if (countBadge) countBadge.innerText = `${eventCounter} Sự kiện`;

  // 1. Ẩn dòng thông báo rỗng
  const emptyState = document.getElementById('empty-state');
  if (emptyState) emptyState.style.display = 'none';

  // 2. Thêm dòng thông báo vào luồng sự kiện Live Stream
  const container = document.getElementById('event-logs-container');
  if (container) {
    const item = document.createElement('div');
    item.className = 'event-log-item';
    item.innerHTML = `
      <div>
        <strong style="color: #fbbf24;">⚡ SHOP_VIP_BOUGHT:</strong>
        <span>Người dùng <strong>#${data.userId || '123'}</strong> vừa mua huy hiệu <strong>${data.badge || 'VÀNG'}</strong>!</span>
      </div>
      <span style="color: #64748b; font-size: 0.75rem;">${new Date().toLocaleTimeString()}</span>
    `;
    container.prepend(item);
  }

  // 3. Tự động kích hoạt Huy hiệu VIP trên bài viết của Thành viên #123
  if (data.userId == 123 || !data.userId) {
    const vipTag = document.getElementById('badge-123');
    const avatar = document.getElementById('avatar-123');
    const postCard = document.getElementById('post-user-123');

    if (vipTag) {
      vipTag.innerText = `⭐ VIP ${data.badge || 'VÀNG'}`;
      vipTag.className = 'vip-tag active';
    }

    if (avatar) {
      avatar.style.borderColor = '#f59e0b';
      avatar.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.5)';
      avatar.style.color = '#f59e0b';
    }

    if (postCard) {
      postCard.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    }

    // Hiển thị alert thông báo trực quan theo yêu cầu đề bài
    alert(`📢 [FORUM ANTI-MESH NOTIFICATION]\nNgười dùng #${data.userId || 123} vừa nâng cấp huy hiệu ${data.badge || 'VÀNG'} thành công!`);
  }
});

console.log('✅ [FORUM MODULE] Đã sẵn sàng lắng nghe sự kiện liên module qua Modular-OS Bridge.');

