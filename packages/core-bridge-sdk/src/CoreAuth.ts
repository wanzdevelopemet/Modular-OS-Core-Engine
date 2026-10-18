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

export class CoreAuth {
    private static TOKEN_KEY = 'modular_os_cams_token';
    private static USER_KEY = 'modular_os_cams_user';

    /**
     * Lấy JWT token hiện tại từ Storage
     */
    public static getToken(): string | null {
        if (typeof window !== 'undefined' && window.localStorage) {
            return localStorage.getItem(this.TOKEN_KEY);
        }
        return null;
    }

    /**
     * Lưu JWT Token vào Storage
     */
    public static setToken(token: string): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(this.TOKEN_KEY, token);
            // Phát sự kiện đồng bộ token cho các module khác trong cùng shell
            window.dispatchEvent(new CustomEvent('MODULAR_OS_AUTH_CHANGED', { detail: { token } }));
        }
    }

    /**
     * Xóa token (Đăng xuất)
     */
    public static clearToken(): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(this.TOKEN_KEY);
            localStorage.removeItem(this.USER_KEY);
            window.dispatchEvent(new CustomEvent('MODULAR_OS_AUTH_CHANGED', { detail: { token: null } }));
        }
    }

    /**
     * Lấy thông tin User hiện tại bằng cách giải mã Payload JWT Token
     */
    public static getUser(): UserProfile | null {
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

    /**
     * Yêu cầu Host Shell hiển thị Global Login Modal
     * Hỗ trợ cả Iframe (thông qua window.parent.postMessage) và Module Federation (CustomEvent)
     */
    public static requireLogin(redirectUrl?: string): void {
        if (typeof window === 'undefined') return;

        const eventDetail = {
            action: 'OPEN_LOGIN_MODAL',
            redirectUrl: redirectUrl || window.location.href,
            timestamp: Date.now()
        };

        // 1. Nếu đang chạy trong Iframe
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'MODULAR_OS_REQUIRE_LOGIN', payload: eventDetail }, '*');
        }

        // 2. Nếu đang chạy trực tiếp trong Host Shell (Module Federation / Web Component)
        window.dispatchEvent(new CustomEvent('MODULAR_OS_REQUIRE_LOGIN', { detail: eventDetail }));
    }

    /**
     * Cập nhật thông tin Profile người dùng lên Core CAMS API
     */
    public static async updateProfile(
        data: { displayName?: string; avatar?: string },
        gatewayUrl: string = '/api/core'
    ): Promise<boolean> {
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

