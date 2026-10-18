import { generateHmacSha256 } from './crypto.js';
import { CoreAuth } from './CoreAuth.js';
/**
 * CoreBridge: Cầu nối giao tiếp chống đan lưới (Anti-Mesh Event Bridge)
 *
 * Thay vì gọi API trực tiếp giữa các module:
 * Module A --(emit)--> Core Gateway --(Redis Pub/Sub)--> Module B --(on)
 */
export class CoreBridge {
    static listeners = new Map();
    static isInitialized = false;
    static eventSource = null;
    /**
     * Kết nối Server-Sent Events (SSE) để đồng bộ đa máy khách thời gian thực qua Redis Pub/Sub
     */
    static connectEventStream(gatewayUrl = '/api/core') {
        if (typeof window === 'undefined' || typeof EventSource === 'undefined')
            return;
        if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED)
            return;
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
                            }
                            catch (err) {
                                // Bỏ qua lỗi cross-origin
                            }
                        });
                    }
                    // 3. Bắn CustomEvent cho các Web Components
                    window.dispatchEvent(new CustomEvent('MODULAR_OS_BUS_EVENT', {
                        detail: { eventName, payload }
                    }));
                }
                catch (err) {
                    console.warn('[CoreBridge SSE] Lỗi giải mã sự kiện từ stream:', err);
                }
            });
            this.eventSource.onerror = () => {
                // EventSource sẽ tự động thử kết nối lại
            };
        }
        catch (err) {
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
    /**
     * Khởi tạo bộ lắng nghe toàn cục trên trình duyệt (PostMessage & CustomEvents)
     */
    static initBrowserListener() {
        if (this.isInitialized || typeof window === 'undefined')
            return;
        // 1. Lắng nghe PostMessage từ Iframe cha/con
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'MODULAR_OS_EVENT') {
                const { eventName, payload } = event.data;
                this.dispatchLocal(eventName, payload);
            }
        });
        // 2. Lắng nghe CustomEvent trên cùng Window (Vite Module Federation / Web Components)
        window.addEventListener('MODULAR_OS_BUS_EVENT', ((event) => {
            if (event.detail) {
                const { eventName, payload } = event.detail;
                this.dispatchLocal(eventName, payload);
            }
        }));
        this.isInitialized = true;
    }
    /**
     * Kích hoạt các callback đã đăng ký cục bộ
     */
    static dispatchLocal(eventName, payload) {
        const callbacks = this.listeners.get(eventName);
        if (callbacks) {
            callbacks.forEach((cb) => {
                try {
                    cb(payload);
                }
                catch (e) {
                    console.error(`Lỗi thực thi callback cho event [${eventName}]:`, e);
                }
            });
        }
    }
    /**
     * BẮN SỰ KIỆN LÊN HỆ SINH THÁI (Zero-Trust HMAC Emission)
     *
     * @param eventName Tên sự kiện (VD: 'SHOP_VIP_BOUGHT')
     * @param payload Dữ liệu sự kiện
     * @param moduleSecret Khóa bí mật đã đăng ký trong modules_registry
     * @param moduleId Mã định danh module (VD: 'shop-module')
     * @param gatewayUrl URL của Core Gateway (Mặc định: /api/core)
     */
    static async emit(eventName, payload, moduleSecret, moduleId, gatewayUrl = '/api/core') {
        this.initBrowserListener();
        const timestamp = Date.now().toString();
        const requestBody = JSON.stringify({
            event: eventName,
            payload: payload
        });
        // Tạo chữ ký số HMAC-SHA256 theo chuẩn: HMAC(body:timestamp, secret)
        const dataToSign = `${requestBody}:${timestamp}`;
        const signature = await generateHmacSha256(dataToSign, moduleSecret);
        // Chuẩn bị Headers Zero-Trust
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
        // 1. Phát tán sự kiện lên Core Gateway để đẩy vào Redis Pub/Sub
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
        }
        catch (error) {
            console.warn(`[CoreBridge] Không thể gửi HTTP event tới Gateway (${gatewayUrl}), fallback sang local bus:`, error);
        }
        // 2. Đồng thời phát tán cục bộ trong Browser để UI phản ứng tức thì
        if (typeof window !== 'undefined') {
            // Cho Window hiện tại
            this.dispatchLocal(eventName, payload);
            // Cho Shell bọc ngoài nếu đang nằm trong Iframe
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'MODULAR_OS_EVENT',
                    eventName,
                    payload
                }, '*');
            }
            // Cho các module Federation cùng chia sẻ window
            window.dispatchEvent(new CustomEvent('MODULAR_OS_BUS_EVENT', {
                detail: { eventName, payload }
            }));
        }
        return responseData;
    }
    /**
     * LẮNG NGHE SỰ KIỆN TỪ EVENT BUS (Anti-Mesh Consumer)
     *
     * @param eventName Tên sự kiện cần lắng nghe
     * @param callback Hàm xử lý khi sự kiện kích hoạt
     * @returns Hàm hủy lắng nghe (Unsubscribe)
     */
    static on(eventName, callback) {
        this.initBrowserListener();
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(callback);
        // Trả về hàm hủy đăng ký tiện lợi
        return () => {
            this.off(eventName, callback);
        };
    }
    /**
     * Hủy đăng ký lắng nghe sự kiện
     */
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
//# sourceMappingURL=CoreBridge.js.map