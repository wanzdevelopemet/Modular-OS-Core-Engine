/**
 * CoreAuth: Quản lý định danh và xác thực CAMS (Core Account Management System)
 */
export interface UserProfile {
    id: number;
    email: string;
    displayName: string;
    avatar?: string;
    globalRole: 'super_admin' | 'admin' | 'user';
}
export declare class CoreAuth {
    private static TOKEN_KEY;
    private static USER_KEY;
    /**
     * Lấy JWT token hiện tại từ Storage
     */
    static getToken(): string | null;
    /**
     * Lưu JWT Token vào Storage
     */
    static setToken(token: string): void;
    /**
     * Xóa token (Đăng xuất)
     */
    static clearToken(): void;
    /**
     * Lấy thông tin User hiện tại bằng cách giải mã Payload JWT Token
     */
    static getUser(): UserProfile | null;
    /**
     * Yêu cầu Host Shell hiển thị Global Login Modal
     * Hỗ trợ cả Iframe (thông qua window.parent.postMessage) và Module Federation (CustomEvent)
     */
    static requireLogin(redirectUrl?: string): void;
    /**
     * Cập nhật thông tin Profile người dùng lên Core CAMS API
     */
    static updateProfile(data: {
        displayName?: string;
        avatar?: string;
    }, gatewayUrl?: string): Promise<boolean>;
}
//# sourceMappingURL=CoreAuth.d.ts.map