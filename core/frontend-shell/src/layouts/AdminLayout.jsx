import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';

/**
 * AdminLayout: Layout quản trị trung tâm dành riêng cho các route /admin/*
 * Tách biệt hoàn toàn không gian quản trị hạt nhân với trải nghiệm người dùng cuối.
 * Bao gồm Top Navigation Bar, User Avatar CAMS, thông báo và menu điều khiển.
 */
export function AdminLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#030712', color: '#f8fafc' }}>
      {/* Top Navigation Bar & User Avatar / CAMS State */}
      <Header />

      {/* Nội dung Admin View (Outlet cho nested routes hoặc children) */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children || <Outlet />}
      </main>

      {/* Footer quản trị lõi */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '1.25rem 2rem',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.8rem'
      }}>
        Modular-OS • Kiến trúc Microkernel & Micro-Frontend Enterprise • Anti-Mesh & Zero-Trust Architecture
      </footer>
    </div>
  );
}

export default AdminLayout;

