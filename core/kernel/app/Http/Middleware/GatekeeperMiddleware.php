<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\ModuleRegistry;
use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

/**
 * GatekeeperMiddleware: Trạm gác Zero-Trust & Anti-Mesh Security
 * 
 * Nhiệm vụ:
 * 1. Xác thực Module ID: Kiểm tra module đã đăng ký và đang Active hay không.
 * 2. Xác thực HMAC Signature: Chống mạo danh module và chống thay đổi dữ liệu (Data Tampering).
 * 3. Kiểm tra Replay Attack: So khớp X-Timestamp tránh tấn công phát lại.
 * 4. Xác thực JWT (CAMS Identity): Nếu module yêu cầu auth (requires_auth == true), bắt buộc có JWT Token hợp lệ.
 */
class GatekeeperMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // -----------------------------------------------------------------
        // BƯỚC 1: KIỂM TRA ĐỊNH DANH MODULE (X-Module-ID)
        // -----------------------------------------------------------------
        $moduleId = $request->header('X-Module-ID');

        if (!$moduleId) {
            return response()->json([
                'success' => false,
                'error_code' => 'MISSING_MODULE_ID',
                'message' => 'Lỗi bảo mật Zero-Trust: Thiếu Header định danh [X-Module-ID].'
            ], Response::HTTP_FORBIDDEN);
        }

        // Truy vấn Registry xem module có tồn tại và đang active không
        $module = ModuleRegistry::where('module_id', $moduleId)
            ->where('is_active', true)
            ->first();

        if (!$module) {
            return response()->json([
                'success' => false,
                'error_code' => 'UNAUTHORIZED_OR_INACTIVE_MODULE',
                'message' => "Module [{$moduleId}] không tồn tại trên hệ thống hoặc đã bị tắt kích hoạt."
            ], Response::HTTP_FORBIDDEN);
        }

        // Gắn thông tin module vào Request để các Controller hạ nguồn sử dụng
        $request->attributes->set('current_module', $module);

        // -----------------------------------------------------------------
        // BƯỚC 2: XÁC THỰC CHỮ KÝ SỐ HMAC (X-HMAC-Signature & Anti-Replay)
        // -----------------------------------------------------------------
        $hmacSignature = $request->header('X-HMAC-Signature');
        $timestamp = $request->header('X-Timestamp');

        if (!$hmacSignature) {
            return response()->json([
                'success' => false,
                'error_code' => 'MISSING_HMAC_SIGNATURE',
                'message' => 'Lỗi bảo mật Anti-Mesh: Thiếu chữ ký số [X-HMAC-Signature].'
            ], Response::HTTP_FORBIDDEN);
        }

        // Kiểm tra độ lệch thời gian (Chống Replay Attack trong khoảng 5 phút = 300s)
        if ($timestamp) {
            $currentTime = time();
            $requestTime = is_numeric($timestamp) ? (int) $timestamp : strtotime($timestamp);
            // Nếu timestamp gửi theo miliseconds
            if ($requestTime > 1000000000000) {
                $requestTime = (int) ($requestTime / 1000);
            }

            if (abs($currentTime - $requestTime) > 300) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'REPLAY_ATTACK_DETECTED',
                    'message' => 'Yêu cầu bị từ chối: Lệch thời gian quá 300 giây (Nghi vấn Replay Attack).'
                ], Response::HTTP_FORBIDDEN);
            }
        }

        // Thu thập toàn bộ nội dung body cần băm
        $rawPayload = $request->getContent();

        // Khóa bí mật dùng để xác thực HMAC: fallback từ secret_key_hash sang secret_key
        // Ngăn chặn null-pointer exception hoặc bypass nếu một trong hai trường bị thiếu
        $secretKey = $module->secret_key_hash ?: $module->secret_key;

        // Tập hợp danh sách các key ứng viên để đối soát an toàn (hỗ trợ cả plain secret_key và hash)
        $candidateKeys = array_values(array_unique(array_filter([
            $secretKey,
            $module->secret_key,
            $module->secret_key_hash
        ], fn($k) => !empty($k))));

        if (empty($candidateKeys)) {
            return response()->json([
                'success' => false,
                'error_code' => 'MODULE_SECRET_NOT_CONFIGURED',
                'message' => "Lỗi bảo mật Zero-Trust: Module [{$moduleId}] chưa thiết lập khóa bí mật (Secret Key) để ký HMAC."
            ], Response::HTTP_FORBIDDEN);
        }

        // Hỗ trợ các chuẩn ký số của SDK Bridge và HTTP Gateway:
        // 1. Chuẩn @modular-os/bridge: `${rawPayload}:${timestamp}`
        // 2. Chuẩn REST API: `${timestamp}.${rawPayload}`
        // 3. Chuẩn băm Raw: `${rawPayload}`
        $dataToSign1 = $rawPayload . ($timestamp ? ":{$timestamp}" : "");
        $dataToSign2 = ($timestamp ? "{$timestamp}." : "") . $rawPayload;
        $dataToSign3 = $rawPayload;

        $isValidSignature = false;
        foreach ($candidateKeys as $key) {
            $expectedSig1 = hash_hmac('sha256', $dataToSign1, $key);
            $expectedSig2 = hash_hmac('sha256', $dataToSign2, $key);
            $expectedSig3 = hash_hmac('sha256', $dataToSign3, $key);

            // So khớp chữ ký an toàn với hàm hash_equals (chống tấn công Timing Attack)
            if (hash_equals($expectedSig1, $hmacSignature) || 
                hash_equals($expectedSig2, $hmacSignature) || 
                hash_equals($expectedSig3, $hmacSignature)) {
                $isValidSignature = true;
                break;
            }
        }

        if (!$isValidSignature) {
            return response()->json([
                'success' => false,
                'error_code' => 'INVALID_HMAC_SIGNATURE',
                'message' => 'Chữ ký HMAC không khớp! Dữ liệu đã bị can thiệp hoặc khóa bí mật không đúng.'
            ], Response::HTTP_FORBIDDEN);
        }

        // -----------------------------------------------------------------
        // BƯỚC 3: KIỂM TRA ĐỊNH DANH NGƯỜI DÙNG CAMS (JWT TOKEN)
        // -----------------------------------------------------------------
        if ($module->requires_auth) {
            $authHeader = $request->header('Authorization');

            if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'AUTH_TOKEN_REQUIRED',
                    'message' => "Module [{$moduleId}] yêu cầu xác thực người dùng. Thiếu Authorization Bearer token."
                ], Response::HTTP_UNAUTHORIZED);
            }

            $jwtToken = substr($authHeader, 7);

            try {
                $jwtSecret = env('JWT_SECRET', 'modular_os_cams_jwt_super_secret_key_2026_xyz');
                $decoded = JWT::decode($jwtToken, new Key($jwtSecret, 'HS256'));

                // Kiểm tra User tồn tại và active
                $user = User::where('id', $decoded->sub ?? $decoded->user_id ?? 0)
                    ->where('status', 'active')
                    ->first();

                if (!$user) {
                    return response()->json([
                        'success' => false,
                        'error_code' => 'USER_INACTIVE_OR_NOT_FOUND',
                        'message' => 'Người dùng trong Token không hợp lệ hoặc đã bị khóa tài khoản.'
                    ], Response::HTTP_UNAUTHORIZED);
                }

                // Gắn User đã xác thực vào request
                $request->attributes->set('authenticated_user', $user);
                $request->setUserResolver(fn() => $user);

            } catch (Exception $e) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'INVALID_EXPIRED_TOKEN',
                    'message' => 'JWT Token không hợp lệ hoặc đã hết hạn: ' . $e->getMessage()
                ], Response::HTTP_UNAUTHORIZED);
            }
        }

        // Vượt qua trạm gác thành công, chuyển tiếp request vào lõi
        return $next($request);
    }
}

