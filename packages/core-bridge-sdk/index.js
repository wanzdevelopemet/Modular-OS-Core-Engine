/**
 * @modular-os/bridge
 * Universal Bridge SDK for Modular-OS Microkernel & Micro-Frontend Architecture
 */

/**
 * Universal HMAC-SHA256 generator (Browser Web Crypto API & Node.js fallback)
 */
export async function generateHmacSha256(message, secretKey) {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const crypto = await import('crypto');
      return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
    } catch (e) {
      // Fallback
    }
  }

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const msgData = encoder.encode(message);

    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return 'stub_hmac_hash_' + Math.random().toString(36).substring(2);
}

/**
 * CoreAuth: Quản lý định danh người dùng tập trung (CAMS)
 */
export class CoreAuth {
  static TOKEN_KEY = 'modular_os_cams_token';
  static USER_KEY = 'modular_os_cams_user';

  static getToken() {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  static setToken(token) {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.TOKEN_KEY, token);
      window.dispatchEvent(new CustomEvent('MODULAR_OS_AUTH_CHANGED', { detail: { token } }));
    }
  }

  static clearToken() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      window.dispatchEvent(new CustomEvent('MODULAR_OS_AUTH_CHANGED', { detail: { token: null } }));
    }
  }

  static getUser() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      return {
        id: decoded.sub || decoded.user_id,
        email: decoded.email,
        displayName: decoded.display_name,
        avatar: decoded.avatar,
        globalRole: decoded.global_role || 'user'
      };
    } catch (e) {
      console.error('Không thể giải mã JWT Token:', e);
      return null;
    }
  }

  static requireLogin(redirectUrl) {
    if (typeof window === 'undefined') return;

    const eventDetail = {
      action: 'OPEN_LOGIN_MODAL',
      redirectUrl: redirectUrl || window.location.href,
      timestamp: Date.now()
    };

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'MODULAR_OS_REQUIRE_LOGIN', payload: eventDetail }, '*');
    }

    window.dispatchEvent(new CustomEvent('MODULAR_OS_REQUIRE_LOGIN', { detail: eventDetail }));
  }

  static async updateProfile(data, gatewayUrl = '/api/core') {
    const token = this.getToken();
    if (!token) {
      this.requireLogin();
      return false;
    }

    const response = await fetch(`${gatewayUrl}/extensions/cams/profile/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Cập nhật hồ sơ thất bại: HTTP ${response.status}`);
    }

    return true;
  }
}

/**
 * CoreBridge: Cầu nối giao tiếp liên module Anti-Mesh
 */
export class CoreBridge {
  static listeners = new Map();
  static isInitialized = false;
  static eventSource = null;

  /**
   * Kết nối Server-Sent Events (SSE) để đồng bộ đa máy khách thời gian thực qua Redis Pub/Sub
   */
  static connectEventStream(gatewayUrl = '/api/core') {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) return;

    this.initBrowserListener();

    const normalizedUrl = gatewayUrl.replace(/\/+$/, '');
    const streamEndpoint = `${normalizedUrl}/events/stream`;

    try {
      this.eventSource = new EventSource(streamEndpoint);

      this.eventSource.addEventListener('MODULAR_OS_EVENT', (e) => {
        try {
          const data = JSON.parse(e.data);
          const eventName = data.event || data.eventName;
          const payload = data.payload || {};

          // 1. Phân phối cục bộ cho các handler đã đăng ký qua CoreBridge.on()
          this.dispatchLocal(eventName, payload);

          // 2. Chuyển tiếp (relay) vào toàn bộ Iframe lồng nhau (VD: Forum Module)
          if (typeof document !== 'undefined') {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach((iframe) => {
              try {
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({
                    type: 'MODULAR_OS_EVENT',
                    eventName,
                    payload
                  }, '*');
                }
              } catch (err) {
                // Bỏ qua lỗi cross-origin
              }
            });
          }

          // 3. Bắn CustomEvent cho các Web Components
          window.dispatchEvent(new CustomEvent('MODULAR_OS_BUS_EVENT', {
            detail: { eventName, payload }
          }));
        } catch (err) {
          console.warn('[CoreBridge SSE] Lỗi giải mã sự kiện từ stream:', err);
        }
      });

      this.eventSource.onerror = () => {
        // EventSource sẽ tự động thử kết nối lại
      };
    } catch (err) {
      console.warn('[CoreBridge] Không thể khởi tạo SSE EventSource:', err);
    }
  }

  /**
   * Ngắt kết nối SSE Stream
   */
  static disconnectEventStream() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  static initBrowserListener() {
    if (this.isInitialized || typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'MODULAR_OS_EVENT') {
        const { eventName, payload } = event.data;
        this.dispatchLocal(eventName, payload);
      }
    });

    window.addEventListener('MODULAR_OS_BUS_EVENT', ((event) => {
      if (event.detail) {
        const { eventName, payload } = event.detail;
        this.dispatchLocal(eventName, payload);
      }
    }));

    this.isInitialized = true;
  }

  static dispatchLocal(eventName, payload) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Lỗi thực thi callback cho event [${eventName}]:`, e);
        }
      });
    }
  }

  static async emit(eventName, payload, moduleSecret, moduleId, gatewayUrl = '/api/core') {
    this.initBrowserListener();

    const timestamp = Date.now().toString();
    const requestBody = JSON.stringify({
      event: eventName,
      payload: payload
    });

    const dataToSign = `${requestBody}:${timestamp}`;
    const signature = await generateHmacSha256(dataToSign, moduleSecret);

    const headers = {
      'Content-Type': 'application/json',
      'X-Module-ID': moduleId,
      'X-HMAC-Signature': signature,
      'X-Timestamp': timestamp
    };

    const token = CoreAuth.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let responseData = null;
    try {
      const res = await fetch(`${gatewayUrl}/event-bus/publish`, {
        method: 'POST',
        headers,
        body: requestBody
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Core Gateway từ chối Event: HTTP ${res.status} - ${errText}`);
      }

      responseData = await res.json();
    } catch (error) {
      console.warn(`[CoreBridge] Không thể gửi HTTP event tới Gateway (${gatewayUrl}), fallback sang local bus:`, error);
    }

    if (typeof window !== 'undefined') {
      this.dispatchLocal(eventName, payload);

      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'MODULAR_OS_EVENT',
          eventName,
          payload
        }, '*');
      }

      window.dispatchEvent(new CustomEvent('MODULAR_OS_BUS_EVENT', {
        detail: { eventName, payload }
      }));
    }

    return responseData;
  }

  static on(eventName, callback) {
    this.initBrowserListener();

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(callback);

    return () => {
      this.off(eventName, callback);
    };
  }

  static off(eventName, callback) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }
}

