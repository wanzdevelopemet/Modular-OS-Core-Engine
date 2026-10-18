import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, Navigate, Link } from 'react-router-dom';
import { CoreBridge } from '@modular-os/bridge';
import { PortalHome } from '../pages/PortalHome';
import { AdminDashboard } from '../pages/AdminDashboard';
import { UniversalModuleLoader } from '../components/UniversalModuleLoader';
import { AdminLayout } from '../layouts/AdminLayout';
import { DelegatedModuleLayout } from '../layouts/DelegatedModuleLayout';
import { api } from '../api/apiClient';
import { Loader2, ArrowLeft } from 'lucide-react';

/**
 * ModuleRouteWrapper: Trích xuất module_id từ URL và render UniversalModuleLoader
 */
function ModuleRouteWrapper({ modules }) {
  const { moduleId } = useParams();
  const moduleConfig = modules.find((m) => m.module_id === moduleId);

  if (!moduleConfig) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <h2 style={{ color: '#f87171', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Module không tồn tại hoặc đã bị tắt kích hoạt
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          Không tìm thấy module [<code>{moduleId}</code>] trong danh bạ Core Registry.
        </p>
        <Link
          to="/admin/hub"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.65rem 1.25rem',
            background: '#4f46e5',
            color: '#ffffff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          <ArrowLeft size={16} /> Quay lại Cổng Tổng (/admin/hub)
        </Link>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#030712' }}>
      {/* Top Module Navigation Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '0.6rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link
            to="/admin/hub"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
          >
            <ArrowLeft size={14} /> Cổng Tổng
          </Link>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: '700' }}>
            {moduleConfig.name}
          </span>
          <code style={{ fontSize: '0.725rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
            {moduleConfig.module_id}
          </code>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            to="/admin/registry"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#cbd5e1',
              fontSize: '0.78rem',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            Quản Trị Lõi
          </Link>
        </div>
      </div>

      <div style={{ padding: '1rem 1.5rem' }}>
        <UniversalModuleLoader moduleConfig={moduleConfig} />
      </div>
    </div>
  );
}

/**
 * AppRouter: Phân định ranh giới tuyệt đối giữa End-User View và Admin View
 */
export function AppRouter() {
  const [modules, setModules] = useState([]);
  const [defaultHomeModule, setDefaultHomeModule] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModules = async () => {
    try {
      const data = await api.get('/modules');
      const activeMods = data.modules || [];
      setModules(activeMods);

      // Tìm module được chỉ định làm Trang chủ mặc định (is_default_home === true)
      const homeMod = activeMods.find((m) => Boolean(m.is_default_home)) || null;
      setDefaultHomeModule(homeMod);
    } catch (error) {
      console.error('[AppRouter] Không thể lấy danh sách module từ Core:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();

    // Lắng nghe sự kiện đổi trạng thái module hoặc đổi Home từ Admin qua Event Bus
    const unsubStatus = CoreBridge.on('MODULE_STATUS_CHANGED', () => fetchModules());
    const unsubHome = CoreBridge.on('MODULE_HOME_CHANGED', () => fetchModules());
    const unsubReg = CoreBridge.on('MODULE_REGISTERED', () => fetchModules());
    const unsubDel = CoreBridge.on('MODULE_DELETED', () => fetchModules());

    return () => {
      unsubStatus();
      unsubHome();
      unsubReg();
      unsubDel();
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#030712'
      }}>
        <Loader2 size={40} className="animate-spin" style={{ color: '#6366f1', marginBottom: '1rem' }} />
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Đang khởi tạo Modular-OS Microkernel Shell...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* 1. END-USER VIEW: ROUTE GỐC (/) */}
      {/* Khi module được ủy quyền làm Trang chủ, nó được render hoàn toàn độc lập qua DelegatedModuleLayout */}
      {/* Nếu chưa có module nào được set làm Default Home, tự động chuyển hướng đến Cổng Tổng /admin/hub */}
      <Route
        path="/"
        element={
          defaultHomeModule ? (
            <DelegatedModuleLayout moduleConfig={defaultHomeModule} />
          ) : (
            <Navigate to="/admin/hub" replace />
          )
        }
      />

      {/* 2. ADMIN VIEW: CÁC ROUTE BẮT ĐẦU BẰNG /admin ĐƯỢC BỌC NGHIÊM NGẶT BỞI AdminLayout */}
      <Route path="/admin" element={<AdminLayout />}>
        {/* /admin mặc định điều hướng vào Bảng Quản Trị Lõi (/admin/registry) */}
        <Route index element={<Navigate to="/admin/registry" replace />} />

        {/* /admin/hub: Cổng Tổng (Hub) danh sách modules */}
        <Route
          path="hub"
          element={
            <PortalHome
              modules={modules}
              defaultHomeModule={defaultHomeModule}
              onRefresh={fetchModules}
            />
          }
        />

        {/* /admin/registry: Quản trị đăng ký Module, Tiện ích Lõi Extensions, Cấu hình Home & Giám sát */}
        <Route
          path="registry"
          element={<AdminDashboard onRefresh={fetchModules} />}
        />
      </Route>

      {/* 3. TƯƠNG THÍCH ĐƯỜNG DẪN CŨ (BACKWARD COMPATIBILITY REDIRECTS) */}
      <Route path="/portal" element={<Navigate to="/admin/hub" replace />} />
      <Route path="/core-admin" element={<Navigate to="/admin/registry" replace />} />

      {/* 4. SATELLITE MODULE STANDALONE VIEW (/m/:moduleId) */}
      <Route
        path="/m/:moduleId"
        element={<ModuleRouteWrapper modules={modules} />}
      />

      {/* 5. WILDCARD FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
