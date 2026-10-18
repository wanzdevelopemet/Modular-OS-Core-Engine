import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { CoreBridge } from '@modular-os/bridge';
import { AppRouter } from './router/AppRouter';
import { GlobalLoginModal } from '../../extensions/cams/frontend/GlobalLoginModal.jsx';

/**
 * App: Khung vỏ bọc Root của Host Shell (Modular-OS)
 * Đảm bảo sự phân tách tuyệt đối giữa End-User View và Admin View.
 * Tự động kết nối Server-Sent Events (SSE) để đồng bộ đa máy khách thời gian thực qua Redis Pub/Sub.
 */
export function App() {
  useEffect(() => {
    // Khởi tạo luồng đồng bộ sự kiện thời gian thực (Multi-Client Realtime Event Bus)
    CoreBridge.connectEventStream('/api/core');

    return () => {
      CoreBridge.disconnectEventStream();
    };
  }, []);

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#030712', color: '#f8fafc' }}>
        {/* Bộ định tuyến đa vùng: Phân bổ Layout cho End-User vs Admin */}
        <AppRouter />

        {/* Modal Đăng nhập Toàn cục của CAMS (Overlay khả dụng toàn hệ sinh thái) */}
        <GlobalLoginModal />
      </div>
    </BrowserRouter>
  );
}

export default App;
