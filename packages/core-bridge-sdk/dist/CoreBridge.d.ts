export type EventCallback = (payload: any) => void;
/**
 * CoreBridge: Cầu nối giao tiếp chống đan lưới (Anti-Mesh Event Bridge)
 *
 * Thay vì gọi API trực tiếp giữa các module:
 * Module A --(emit)--> Core Gateway --(Redis Pub/Sub)--> Module B --(on)
 */
export declare class CoreBridge {
    private static listeners;
    private static isInitialized;
    private static eventSource;
    /**
     * Kết nối Server-Sent Events (SSE) để đồng bộ đa máy khách thời gian thực qua Redis Pub/Sub
     */
    static connectEventStream(gatewayUrl?: string): void;
    /**
     * Ngắt kết nối SSE Stream
     */
    static disconnectEventStream(): void;
    /**
     * Khởi tạo bộ lắng nghe toàn cục trên trình duyệt (PostMessage & CustomEvents)
     */
    private static initBrowserListener;
    /**
     * Kích hoạt các callback đã đăng ký cục bộ
     */
    private static dispatchLocal;
    /**
     * BẮN SỰ KIỆN LÊN HỆ SINH THÁI (Zero-Trust HMAC Emission)
     *
     * @param eventName Tên sự kiện (VD: 'SHOP_VIP_BOUGHT')
     * @param payload Dữ liệu sự kiện
     * @param moduleSecret Khóa bí mật đã đăng ký trong modules_registry
     * @param moduleId Mã định danh module (VD: 'shop-module')
     * @param gatewayUrl URL của Core Gateway (Mặc định: /api/core)
     */
    static emit(eventName: string, payload: any, moduleSecret: string, moduleId: string, gatewayUrl?: string): Promise<any>;
    /**
     * LẮNG NGHE SỰ KIỆN TỪ EVENT BUS (Anti-Mesh Consumer)
     *
     * @param eventName Tên sự kiện cần lắng nghe
     * @param callback Hàm xử lý khi sự kiện kích hoạt
     * @returns Hàm hủy lắng nghe (Unsubscribe)
     */
    static on(eventName: string, callback: EventCallback): () => void;
    /**
     * Hủy đăng ký lắng nghe sự kiện
     */
    static off(eventName: string, callback: EventCallback): void;
}
//# sourceMappingURL=CoreBridge.d.ts.map