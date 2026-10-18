/**
 * Bộ tạo mã băm HMAC-SHA256 Universal (Tương thích cả Node.js Backend và Browser Frontend)
 */

export async function generateHmacSha256(message: string, secretKey: string): Promise<string> {
    // 1. Môi trường Node.js Backend
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        try {
            // Dynamic import hoặc require crypto trong Node.js
            const crypto = await import('crypto');
            return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
        } catch (e) {
            // Tiếp tục fallback nếu gặp lỗi
        }
    }

    // 2. Môi trường Trình duyệt (Browser Web Crypto API)
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

    throw new Error('Môi trường thực thi không hỗ trợ Web Crypto API hoặc Node.js crypto module.');
}

