import React, { useEffect, useState } from 'react';
import { CoreAuth } from '@modular-os/bridge';
import { api } from '../api/apiClient';
import { 
  ShieldAlert, 
  Power, 
  Home, 
  Activity, 
  Database, 
  Server, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Radio,
  Sliders,
  Layers,
  Plus,
  Trash2,
  X,
  Puzzle,
  ExternalLink,
  ShieldCheck,
  Check,
  Key,
  Copy,
  Edit,
  Code
} from 'lucide-react';

/**
 * Core Admin Dashboard (/admin/registry)
 * Quản trị toàn diện Modules, Extensions và Giám sát Health / Event Bus.
 */
export function AdminDashboard({ onRefresh: onGlobalRefresh }) {
  const [user, setUser] = useState(CoreAuth.getUser());
  const [modules, setModules] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('modules'); // 'modules' | 'extensions' | 'health'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Modal State
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [showAddExtModal, setShowAddExtModal] = useState(false);
  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsModule, setCredentialsModule] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Helper: Sinh chuỗi bảo mật ngẫu nhiên 32 ký tự (Hex)
  const generateRandomSecret = () => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  };

  // Helper: Sao chép nhanh vào Clipboard
  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Form State: Add Module
  const [moduleForm, setModuleForm] = useState({
    module_id: '',
    name: '',
    frontend_type: 'federation',
    remote_entry_url: '',
    secret_key_hash: generateRandomSecret(),
    requires_auth: false,
    is_default_home: false
  });

  // Form State: Edit Module
  const [editModuleForm, setEditModuleForm] = useState({
    name: '',
    frontend_type: 'federation',
    remote_entry_url: '',
    secret_key_hash: '',
    requires_auth: false
  });

  // Form State: Add Extension
  const [extForm, setExtForm] = useState({
    identifier: '',
    name: ''
  });

  // 1. KIỂM TRA PHÂN QUYỀN SUPER_ADMIN
  useEffect(() => {
    const handleAuthChange = () => {
      setUser(CoreAuth.getUser());
    };
    window.addEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
    return () => window.removeEventListener('MODULAR_OS_AUTH_CHANGED', handleAuthChange);
  }, []);

  const isSuperAdmin = user && user.globalRole === 'super_admin';

  // 2. FETCH REAL DATA TỪ LARAVEL CORE API
  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Danh sách Modules từ DB
      const modData = await api.get('/admin/modules');
      setModules(modData.modules || []);

      // 2. Danh sách Extensions từ DB
      const extData = await api.get('/admin/extensions');
      setExtensions(extData.extensions || []);

      // 3. Health check của Kernel, MySQL, Redis
      const hData = await api.get('/health');
      setHealthStatus(hData.checks);

      // 4. Redis Event Bus Logs
      const logData = await api.get('/admin/event-bus/logs');
      setEventLogs(logData.logs || []);
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu Admin:', e);
      setFeedback({ type: 'error', message: 'Không thể kết nối API Core: ' + e.message });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 5000);
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin]);

  const notifyChange = (msg) => {
    setFeedback({ type: 'success', message: msg });
    setTimeout(() => setFeedback(null), 4000);
    fetchAllData();
    if (onGlobalRefresh) onGlobalRefresh();
  };

  // ==========================================
  // MODULES ACTIONS
  // ==========================================
  const handleToggleModule = async (id) => {
    setActionLoading(`mod-toggle-${id}`);
    try {
      const res = await api.put(`/admin/modules/${id}/toggle`);
      notifyChange(res.message);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefaultHome = async (id) => {
    setActionLoading(`mod-home-${id}`);
    try {
      const res = await api.put(`/admin/modules/${id}/set-home`);
      notifyChange(res.message);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsetDefaultHome = async (id) => {
    setActionLoading(`mod-unhome-${id}`);
    try {
      const res = await api.put(`/admin/modules/${id}/unset-home`);
      notifyChange(res.message);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteModule = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vĩnh viễn module [${name}] khỏi hệ thống?`)) return;
    setActionLoading(`mod-del-${id}`);
    try {
      const res = await api.delete(`/admin/modules/${id}`);
      notifyChange(res.message);
    } catch (e) {
      alert('Lỗi khi xóa: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    setActionLoading('create-module');
    try {
      const res = await api.post('/admin/modules', moduleForm);
      notifyChange(res.message);
      setShowAddModuleModal(false);
      setModuleForm({
        module_id: '',
        name: '',
        frontend_type: 'federation',
        remote_entry_url: '',
        secret_key_hash: generateRandomSecret(),
        requires_auth: false,
        is_default_home: false
      });
    } catch (err) {
      alert('Lỗi đăng ký module: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEditModule = (mod) => {
    setEditingModule(mod);
    setEditModuleForm({
      name: mod.name || '',
      frontend_type: mod.frontend_type || 'federation',
      remote_entry_url: mod.remote_entry_url || mod.url || '',
      secret_key_hash: mod.secret_key || mod.secret_key_hash || '',
      requires_auth: Boolean(mod.requires_auth)
    });
    setShowEditModuleModal(true);
  };

  const handleUpdateModule = async (e) => {
    e.preventDefault();
    if (!editingModule) return;
    setActionLoading(`edit-mod-${editingModule.id}`);
    try {
      const res = await api.put(`/admin/modules/${editingModule.id}`, editModuleForm);
      notifyChange(res.message);
      setShowEditModuleModal(false);
      setEditingModule(null);
    } catch (err) {
      alert('Lỗi cập nhật module: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenCredentials = (mod) => {
    setCredentialsModule(mod);
    setShowCredentialsModal(true);
  };

  // ==========================================
  // EXTENSIONS ACTIONS
  // ==========================================
  const handleToggleExtension = async (id) => {
    setActionLoading(`ext-toggle-${id}`);
    try {
      const res = await api.put(`/admin/extensions/${id}/toggle`);
      notifyChange(res.message);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteExtension = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tiện ích [${name}]?`)) return;
    setActionLoading(`ext-del-${id}`);
    try {
      const res = await api.delete(`/admin/extensions/${id}`);
      notifyChange(res.message);
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateExtension = async (e) => {
    e.preventDefault();
    setActionLoading('create-ext');
    try {
      const res = await api.post('/admin/extensions', extForm);
      notifyChange(res.message);
      setShowAddExtModal(false);
      setExtForm({ identifier: '', name: '' });
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // NẾU KHÔNG PHẢI SUPER_ADMIN -> HIỂN THỊ ACCESS DENIED
  if (!isSuperAdmin) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        padding: '2rem'
      }}>
        <div style={{
          maxWidth: '520px',
          background: 'rgba(23, 23, 37, 0.95)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '20px',
          padding: '2.5rem',
          textAlign: 'center',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '16px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            marginBottom: '1rem'
          }}>
            <ShieldAlert size={48} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fca5a5', marginBottom: '0.75rem' }}>
            Truy Cập Bị Từ Chối (403 Forbidden)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            Khu vực Quản trị Hạt nhân (/admin/registry) yêu cầu tài khoản có quyền <strong>super_admin</strong>. Bạn hiện tại: {user ? `${user.email} (${user.globalRole})` : 'Chưa đăng nhập'}.
          </p>
          <button
            onClick={() => CoreAuth.requireLogin()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.75rem',
              background: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            <ShieldCheck size={18} /> Đăng nhập tài khoản Super Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Toast Feedback */}
      {feedback && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 9999,
          background: feedback.type === 'success' ? '#065f46' : '#991b1b',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600'
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {feedback.message}
        </div>
      )}

      {/* Admin Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sliders size={28} style={{ color: '#6366f1' }} /> Bảng Quản Trị Hạt Nhân (Core Admin)
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Quản trị động Modules, Tiện ích Lõi (Extensions), cấu hình Trang chủ và giám sát Event Bus.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchAllData}
            disabled={isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1rem',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#cbd5e1',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Đồng bộ Lõi
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('modules')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            background: activeTab === 'modules' ? '#4f46e5' : 'rgba(17, 24, 39, 0.6)',
            color: activeTab === 'modules' ? '#ffffff' : '#94a3b8'
          }}
        >
          <Layers size={18} /> Quản Lý Modules ({modules.length})
        </button>

        <button
          onClick={() => setActiveTab('extensions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            background: activeTab === 'extensions' ? '#4f46e5' : 'rgba(17, 24, 39, 0.6)',
            color: activeTab === 'extensions' ? '#ffffff' : '#94a3b8'
          }}
        >
          <Puzzle size={18} /> Tiện Ích Lõi Extensions ({extensions.length})
        </button>

        <button
          onClick={() => setActiveTab('health')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: '700',
            cursor: 'pointer',
            background: activeTab === 'health' ? '#4f46e5' : 'rgba(17, 24, 39, 0.6)',
            color: activeTab === 'health' ? '#ffffff' : '#94a3b8'
          }}
        >
          <Activity size={18} /> Giám Sát Health & Event Bus ({eventLogs.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: MODULES MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'modules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f1f5f9' }}>
              Danh Bạ Vệ Tinh (Module Registry)
            </h3>
            <button
              onClick={() => setShowAddModuleModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Thêm Module Mới
            </button>
          </div>

          <div style={{
            background: 'rgba(17, 24, 39, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>ID / Tên Module</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>Ngàm UI</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>Remote Entry</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>Bảo Mật</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>Trang Chủ</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>Trạng Thái</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', textAlign: 'right' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {modules.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      Chưa có module nào trong danh bạ. Nhấn "Thêm Module Mới" để bắt đầu.
                    </td>
                  </tr>
                ) : (
                  modules.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '1.25rem' }}>
                        <div style={{ fontWeight: '700', color: '#f1f5f9' }}>{m.name}</div>
                        <code style={{ fontSize: '0.75rem', color: '#818cf8' }}>{m.module_id}</code>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem' }}>
                          <Key size={11} color="#10b981" />
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                            Secret: {m.secret_key ? `${m.secret_key.slice(0, 10)}...` : 'N/A'}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '1.25rem' }}>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          background: m.frontend_type === 'federation' ? 'rgba(56, 189, 248, 0.15)' :
                                      m.frontend_type === 'iframe' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: m.frontend_type === 'federation' ? '#38bdf8' :
                                 m.frontend_type === 'iframe' ? '#facc15' : '#c084fc'
                        }}>
                          {m.frontend_type}
                        </span>
                      </td>

                      <td style={{ padding: '1.25rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {m.remote_entry_url}
                        </span>
                      </td>

                      <td style={{ padding: '1.25rem' }}>
                        {m.requires_auth ? (
                          <span style={{ color: '#f43f5e', fontSize: '0.75rem', fontWeight: '700' }}>CAMS JWT</span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Công khai</span>
                        )}
                      </td>

                      <td style={{ padding: '1.25rem' }}>
                        {m.is_default_home ? (
                          <button
                            onClick={() => handleUnsetDefaultHome(m.id)}
                            disabled={actionLoading === `mod-unhome-${m.id}`}
                            title="Bấm để hủy quyền trang chủ"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#10b981',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '0.3rem 0.7rem',
                              borderRadius: '999px',
                              cursor: 'pointer'
                            }}
                          >
                            <Home size={12} /> Trang Chủ (Hủy)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetDefaultHome(m.id)}
                            disabled={!m.is_active || actionLoading === `mod-home-${m.id}`}
                            style={{
                              background: 'transparent',
                              border: '1px dashed rgba(255, 255, 255, 0.2)',
                              color: '#94a3b8',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              cursor: m.is_active ? 'pointer' : 'not-allowed',
                              opacity: m.is_active ? 1 : 0.4
                            }}
                          >
                            Set làm Home
                          </button>
                        )}
                      </td>

                      <td style={{ padding: '1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: m.is_active ? '#34d399' : '#f87171'
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: m.is_active ? '#10b981' : '#ef4444'
                          }} />
                          {m.is_active ? 'Hoạt Động' : 'Đã Tắt'}
                        </span>
                      </td>

                      <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenCredentials(m)}
                            title="Xem thông tin định danh & Secret Key HMAC"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: '#6ee7b7'
                            }}
                          >
                            <Key size={13} /> Khóa HMAC
                          </button>

                          <button
                            onClick={() => handleOpenEditModule(m)}
                            title="Chỉnh sửa cấu hình module"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              background: 'rgba(99, 102, 241, 0.12)',
                              color: '#a5b4fc'
                            }}
                          >
                            <Edit size={13} /> Sửa
                          </button>

                          <button
                            onClick={() => handleToggleModule(m.id)}
                            disabled={actionLoading === `mod-toggle-${m.id}`}
                            title={m.is_active ? 'Tắt ngay module này' : 'Kích hoạt module này'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              background: m.is_active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: m.is_active ? '#f87171' : '#34d399'
                            }}
                          >
                            <Power size={13} />
                            {m.is_active ? 'Tắt' : 'Bật'}
                          </button>

                          <button
                            onClick={() => handleDeleteModule(m.id, m.name)}
                            disabled={actionLoading === `mod-del-${m.id}`}
                            title="Xóa module khỏi danh bạ"
                            style={{
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#94a3b8',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: EXTENSIONS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'extensions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#f1f5f9' }}>
              Danh Bạ Tiện Ích Lõi (Core Extensions & Tools)
            </h3>
            <button
              onClick={() => setShowAddExtModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1rem',
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} /> Đăng Ký Tiện Ích Mới
            </button>
          </div>

          <div style={{
            background: 'rgba(17, 24, 39, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>Định Danh Identifier</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>Tên Tiện Ích</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>Trạng Thái</th>
                  <th style={{ padding: '1rem 1.25rem', color: '#94a3b8', textAlign: 'right' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {extensions.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      Chưa có extension nào được ghi nhận trong Core Database.
                    </td>
                  </tr>
                ) : (
                  extensions.map((ext) => (
                    <tr key={ext.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '1.25rem' }}>
                        <code style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: '700' }}>{ext.identifier}</code>
                      </td>

                      <td style={{ padding: '1.25rem', fontWeight: '600', color: '#f1f5f9' }}>
                        {ext.name}
                      </td>

                      <td style={{ padding: '1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          color: ext.is_active ? '#34d399' : '#f87171'
                        }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: ext.is_active ? '#10b981' : '#ef4444'
                          }} />
                          {ext.is_active ? 'Đang Bật' : 'Đã Tắt'}
                        </span>
                      </td>

                      <td style={{ padding: '1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleToggleExtension(ext.id)}
                            disabled={actionLoading === `ext-toggle-${ext.id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              background: ext.is_active ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: ext.is_active ? '#f87171' : '#34d399'
                            }}
                          >
                            <Power size={13} />
                            {ext.is_active ? 'Vô Hiệu Hóa' : 'Kích Hoạt'}
                          </button>

                          <button
                            onClick={() => handleDeleteExtension(ext.id, ext.name)}
                            style={{
                              padding: '0.4rem 0.6rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#94a3b8',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: HEALTH CHECK & EVENT BUS */}
      {/* ========================================================= */}
      {activeTab === 'health' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          {/* Health Card */}
          <div style={{
            background: 'rgba(17, 24, 39, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.75rem',
            backdropFilter: 'blur(12px)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={20} style={{ color: '#6366f1' }} /> Trạng Thái Lõi Hạ Tầng
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Laravel 11 Microkernel</span>
                <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> {healthStatus?.kernel || 'Online'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>MySQL 8.0 Hạt Nhân</span>
                <span style={{ color: healthStatus?.database === 'connected' ? '#34d399' : '#f87171', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {healthStatus?.database === 'connected' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {healthStatus?.database || 'Kiểm tra...'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Redis 7 Event Broker</span>
                <span style={{ color: healthStatus?.redis === 'connected' ? '#34d399' : '#f87171', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {healthStatus?.redis === 'connected' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {healthStatus?.redis || 'Kiểm tra...'}
                </span>
              </div>
            </div>
          </div>

          {/* Live Event Stream Card */}
          <div style={{
            background: 'rgba(17, 24, 39, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '1.75rem',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Radio size={20} className="animate-pulse" style={{ color: '#10b981' }} /> Redis Event Bus Live Stream
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Auto-polling 5s</span>
            </div>

            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {eventLogs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Chưa có sự kiện nào được ghi nhận trên Redis Event Bus.
                </div>
              ) : (
                eventLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      fontSize: '0.825rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: '700', color: '#818cf8', fontFamily: 'monospace' }}>
                        {log.event}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                      Nguồn phát: <code style={{ color: '#cbd5e1' }}>{log.source_module}</code>
                    </div>

                    <pre style={{
                      margin: 0,
                      padding: '0.5rem',
                      background: 'rgba(3, 7, 18, 0.7)',
                      borderRadius: '4px',
                      color: '#a7f3d0',
                      fontFamily: 'monospace',
                      fontSize: '0.725rem',
                      overflowX: 'auto'
                    }}>
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: THÊM MODULE MỚI */}
      {/* ========================================================= */}
      {showAddModuleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAddModuleModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.5rem' }}>
              Đăng Ký Module Mới vào Lõi
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Khai báo Module vệ tinh để Host Shell và API Gateway thiết lập Service Discovery.
            </p>

            <form onSubmit={handleCreateModule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Mã Định Danh Module ID (duy nhất)
                </label>
                <input
                  type="text"
                  required
                  placeholder="analytics-module"
                  value={moduleForm.module_id}
                  onChange={(e) => setModuleForm({ ...moduleForm, module_id: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Tên Hiển Thị Người Dùng
                </label>
                <input
                  type="text"
                  required
                  placeholder="Thống Kê Doanh Thu"
                  value={moduleForm.name}
                  onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Ngàm Nạp Giao Diện (Adapter)
                  </label>
                  <select
                    value={moduleForm.frontend_type}
                    onChange={(e) => setModuleForm({ ...moduleForm, frontend_type: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="federation">Vite Federation</option>
                    <option value="iframe">Sandboxed Iframe</option>
                    <option value="web-component">Web Component</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1' }}>
                      Khóa Ký Số HMAC Secret Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setModuleForm({ ...moduleForm, secret_key_hash: generateRandomSecret() })}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#818cf8',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <RefreshCw size={11} /> Tự sinh khóa
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="secret_key_abc123"
                    value={moduleForm.secret_key_hash}
                    onChange={(e) => setModuleForm({ ...moduleForm, secret_key_hash: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Đường Dẫn Nạp Từ Xa (Remote Entry URL)
                </label>
                <input
                  type="text"
                  required
                  placeholder="http://localhost:5001/assets/remoteEntry.js hoặc /index.html"
                  value={moduleForm.remote_entry_url}
                  onChange={(e) => setModuleForm({ ...moduleForm, remote_entry_url: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '2rem', padding: '0.5rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={moduleForm.requires_auth}
                    onChange={(e) => setModuleForm({ ...moduleForm, requires_auth: e.target.checked })}
                  />
                  Bắt buộc JWT (CAMS Auth)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={moduleForm.is_default_home}
                    onChange={(e) => setModuleForm({ ...moduleForm, is_default_home: e.target.checked })}
                  />
                  Đặt làm Trang chủ mặc định (/)
                </label>
              </div>

              <button
                type="submit"
                disabled={actionLoading === 'create-module'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                {actionLoading === 'create-module' ? 'Đang đăng ký...' : 'Xác Nhận Đăng Ký Module'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ĐĂNG KÝ EXTENSION MỚI */}
      {/* ========================================================= */}
      {showAddExtModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '20px',
            maxWidth: '480px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAddExtModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.5rem' }}>
              Đăng Ký Tiện Ích Lõi Mới
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Khai báo Extension vào Registry để kích hoạt nạp tự động qua ExtensionServiceProvider.
            </p>

            <form onSubmit={handleCreateExtension} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Định Danh Identifier (tên thư mục trong core/extensions)
                </label>
                <input
                  type="text"
                  required
                  placeholder="audit-logger"
                  value={extForm.identifier}
                  onChange={(e) => setExtForm({ ...extForm, identifier: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Tên Tiện Ích
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nhật Ký Kiểm Toán Lõi"
                  value={extForm.name}
                  onChange={(e) => setExtForm({ ...extForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading === 'create-ext'}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                {actionLoading === 'create-ext' ? 'Đang lưu...' : 'Xác Nhận Đăng Ký Extension'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL: CHỈNH SỬA MODULE */}
      {/* ========================================================= */}
      {showEditModuleModal && editingModule && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            borderRadius: '20px',
            maxWidth: '540px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }}>
            <button
              onClick={() => { setShowEditModuleModal(false); setEditingModule(null); }}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.35rem' }}>
              Chỉnh Sửa Cấu Hình Module
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Cập nhật tham số của module <code style={{ color: '#818cf8' }}>{editingModule.module_id}</code>.
            </p>

            <form onSubmit={handleUpdateModule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Mã Định Danh Module ID (Không thể thay đổi)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingModule.module_id}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', color: '#64748b', fontSize: '0.85rem', boxSizing: 'border-box', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Tên Hiển Thị Người Dùng
                </label>
                <input
                  type="text"
                  required
                  value={editModuleForm.name}
                  onChange={(e) => setEditModuleForm({ ...editModuleForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Ngàm Nạp Giao Diện (Adapter)
                  </label>
                  <select
                    value={editModuleForm.frontend_type}
                    onChange={(e) => setEditModuleForm({ ...editModuleForm, frontend_type: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  >
                    <option value="federation">Vite Federation</option>
                    <option value="iframe">Sandboxed Iframe</option>
                    <option value="web-component">Web Component</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1' }}>
                      Khóa HMAC Secret Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditModuleForm({ ...editModuleForm, secret_key_hash: generateRandomSecret() })}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#818cf8',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <RefreshCw size={11} /> Đổi mới
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={editModuleForm.secret_key_hash}
                    onChange={(e) => setEditModuleForm({ ...editModuleForm, secret_key_hash: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Đường Dẫn Nạp Từ Xa (Remote Entry URL)
                </label>
                <input
                  type="text"
                  required
                  value={editModuleForm.remote_entry_url}
                  onChange={(e) => setEditModuleForm({ ...editModuleForm, remote_entry_url: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ padding: '0.25rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editModuleForm.requires_auth}
                    onChange={(e) => setEditModuleForm({ ...editModuleForm, requires_auth: e.target.checked })}
                  />
                  Bắt buộc xác thực người dùng JWT (CAMS Auth)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setShowEditModuleModal(false); setEditingModule(null); }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Hủy Bỏ
                </button>

                <button
                  type="submit"
                  disabled={actionLoading === `edit-mod-${editingModule.id}`}
                  style={{
                    flex: 2,
                    padding: '0.75rem',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {actionLoading === `edit-mod-${editingModule.id}` ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: XEM KHÓA & THÔNG TIN KÝ SỐ HMAC ZERO-TRUST */}
      {/* ========================================================= */}
      {showCredentialsModal && credentialsModule && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 7, 18, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '20px',
            maxWidth: '620px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }}>
            <button
              onClick={() => { setShowCredentialsModal(false); setCredentialsModule(null); }}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={22} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                  Thông Tin Định Danh & Khóa Ký Số
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Module: <strong style={{ color: '#fff' }}>{credentialsModule.name}</strong>
                </span>
              </div>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Sử dụng các thông số bên dưới để cấu hình Module vệ tinh. Lõi API Gateway Modular-OS sử dụng chữ ký HMAC-SHA256 để định danh Zero-Trust và chống replay attack.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.5rem' }}>
              {/* Field 1: Module ID */}
              <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Header: X-Module-ID</span>
                  <button
                    onClick={() => copyToClipboard(credentialsModule.module_id, 'mod_id')}
                    style={{ background: 'transparent', border: 'none', color: copiedField === 'mod_id' ? '#34d399' : '#818cf8', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {copiedField === 'mod_id' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedField === 'mod_id' ? 'Đã sao chép!' : 'Sao chép'}
                  </button>
                </div>
                <code style={{ fontSize: '0.9rem', color: '#6ee7b7', fontWeight: '700' }}>{credentialsModule.module_id}</code>
              </div>

              {/* Field 2: Secret Key */}
              <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>HMAC Secret Key (Khóa bí mật)</span>
                  <button
                    onClick={() => copyToClipboard(credentialsModule.secret_key || credentialsModule.secret_key_hash, 'secret_key')}
                    style={{ background: 'transparent', border: 'none', color: copiedField === 'secret_key' ? '#34d399' : '#818cf8', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {copiedField === 'secret_key' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedField === 'secret_key' ? 'Đã sao chép!' : 'Sao chép'}
                  </button>
                </div>
                <code style={{ fontSize: '0.9rem', color: '#fbbf24', fontWeight: '700', wordBreak: 'break-all' }}>
                  {credentialsModule.secret_key || credentialsModule.secret_key_hash || '(Chưa cấu hình)'}
                </code>
              </div>

              {/* Field 3: Remote Entry URL */}
              <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Remote Entry URL ({credentialsModule.frontend_type})</span>
                  <button
                    onClick={() => copyToClipboard(credentialsModule.remote_entry_url || credentialsModule.url, 'url')}
                    style={{ background: 'transparent', border: 'none', color: copiedField === 'url' ? '#34d399' : '#818cf8', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    {copiedField === 'url' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedField === 'url' ? 'Đã sao chép!' : 'Sao chép'}
                  </button>
                </div>
                <code style={{ fontSize: '0.85rem', color: '#cbd5e1', wordBreak: 'break-all' }}>
                  {credentialsModule.remote_entry_url || credentialsModule.url}
                </code>
              </div>
            </div>

            {/* Code Snippet */}
            <div style={{ background: 'rgba(3, 7, 18, 0.7)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Code size={13} /> Mẫu tạo chữ ký HMAC (Node.js)
                </span>
                <button
                  onClick={() => copyToClipboard(`const crypto = require('crypto');
const timestamp = Date.now();
const payloadStr = JSON.stringify(body);
const signature = crypto.createHmac('sha256', '${credentialsModule.secret_key || credentialsModule.secret_key_hash}').update(timestamp + '.' + payloadStr).digest('hex');
// Headers:
// 'X-Module-ID': '${credentialsModule.module_id}',
// 'X-Timestamp': timestamp,
// 'X-HMAC-Signature': signature`, 'code')}
                  style={{ background: 'transparent', border: 'none', color: copiedField === 'code' ? '#34d399' : '#94a3b8', fontSize: '0.7rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  {copiedField === 'code' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedField === 'code' ? 'Đã sao chép mã!' : 'Copy mã'}
                </button>
              </div>
              <pre style={{ margin: 0, fontSize: '0.75rem', color: '#a7f3d0', fontFamily: 'monospace', overflowX: 'auto', lineHeight: '1.4' }}>
{`const timestamp = Date.now();
const payloadStr = JSON.stringify(body);
const signature = crypto.createHmac('sha256', secretKey)
  .update(timestamp + '.' + payloadStr)
  .digest('hex');`}
              </pre>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                onClick={() => { setShowCredentialsModal(false); setCredentialsModule(null); }}
                style={{
                  padding: '0.65rem 1.5rem',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
