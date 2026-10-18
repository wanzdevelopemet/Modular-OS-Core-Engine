<?php

namespace Extensions\Cams\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use App\Models\User;
use App\Services\EventBusService;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

/**
 * CamsAuthController: Bộ điều khiển Định danh người dùng tập trung (CAMS)
 * Đảm nhiệm xác thực, cấp phát và thẩm định JWT Token cho toàn hệ sinh thái Modular-OS.
 */
class CamsAuthController extends Controller
{
    protected EventBusService $eventBus;

    public function __construct(EventBusService $eventBus)
    {
        $this->eventBus = $eventBus;
    }

    /**
     * POST /api/extensions/cams/login
     * Đăng nhập xác thực và cấp phát JWT Token cho toàn hệ sinh thái
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = $request->input('email');
        $password = $request->input('password');

        $user = User::where('email', $email)->first();

        $superadminEnabled = filter_var(env('CAMS_SUPERADMIN_ENABLED', false), FILTER_VALIDATE_BOOLEAN);
        $presetPassword = env('CAMS_SUPERADMIN_PASSWORD', 'admin123');

        // Tự động khởi tạo tài khoản super_admin mặc định nếu là lần chạy đầu tiên (Chỉ khi CAMS_SUPERADMIN_ENABLED được kích hoạt)
        if (!$user && $email === 'admin@modular-os.internal' && $superadminEnabled) {
            if ($password === $presetPassword) {
                Log::warning('CAMS Security Warning: Super Admin auto-bootstrap fallback triggered. Disable CAMS_SUPERADMIN_ENABLED in production.', [
                    'email' => $email,
                    'ip' => $request->ip()
                ]);

                $user = User::create([
                    'email' => 'admin@modular-os.internal',
                    'password' => Hash::make($password),
                    'display_name' => 'Hạt Nhân Quản Trị',
                    'avatar' => 'https://api.dicebear.com/7.x/bottts/svg?seed=ModularAdmin',
                    'global_role' => 'super_admin',
                    'status' => 'active',
                ]);
            }
        }

        $isValid = $user && Hash::check($password, $user->password);
        if (!$isValid && $user && $user->email === 'admin@modular-os.internal' && $superadminEnabled && $password === $presetPassword) {
            Log::warning('CAMS Security Warning: Super Admin password reset fallback triggered via CAMS_SUPERADMIN_PASSWORD.', [
                'email' => $email,
                'ip' => $request->ip()
            ]);
            $user->password = Hash::make($password);
            $user->save();
            $isValid = true;
        }

        if (!$isValid) {
            return response()->json([
                'success' => false,
                'message' => 'Email hoặc mật khẩu không chính xác.'
            ], Response::HTTP_UNAUTHORIZED);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt.'
            ], Response::HTTP_FORBIDDEN);
        }

        // Cập nhật thời điểm đăng nhập
        $user->last_login_at = now();
        $user->save();

        // Tạo JWT Token chuẩn chứa UUID, Global Role, exp (8 giờ) và iat
        $jwtSecret = env('JWT_SECRET', 'modular_os_cams_jwt_super_secret_key_2026_xyz');
        $iat = now()->timestamp;
        $exp = now()->addHours(8)->timestamp;

        $payload = [
            'iss' => 'modular-os-kernel',
            'sub' => (string) $user->id,
            'user_id' => $user->id,
            'uuid' => (string) $user->id,
            'email' => $user->email,
            'display_name' => $user->display_name,
            'avatar' => $user->avatar,
            'role' => $user->global_role,
            'global_role' => $user->global_role,
            'iat' => $iat,
            'exp' => $exp
        ];

        $token = JWT::encode($payload, $jwtSecret, 'HS256');

        return response()->json([
            'success' => true,
            'message' => 'Đăng nhập thành công qua CAMS.',
            'token' => $token,
            'expires_in' => 8 * 3600,
            'user' => [
                'id' => $user->id,
                'uuid' => (string) $user->id,
                'email' => $user->email,
                'displayName' => $user->display_name,
                'avatar' => $user->avatar,
                'globalRole' => $user->global_role,
            ]
        ]);
    }

    /**
     * GET /api/extensions/cams/me
     * Xác thực JWT token và trả về thông tin hồ sơ người dùng hiện tại
     */
    public function me(Request $request)
    {
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json([
                'success' => false,
                'message' => 'Thiếu Authorization Bearer token.'
            ], Response::HTTP_UNAUTHORIZED);
        }

        $token = substr($authHeader, 7);
        $jwtSecret = env('JWT_SECRET', 'modular_os_cams_jwt_super_secret_key_2026_xyz');

        try {
            $decoded = JWT::decode($token, new Key($jwtSecret, 'HS256'));
            $user = User::find($decoded->sub ?? $decoded->user_id ?? 0);

            if (!$user || $user->status !== 'active') {
                return response()->json([
                    'success' => false,
                    'message' => 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.'
                ], Response::HTTP_UNAUTHORIZED);
            }

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'uuid' => (string) $user->id,
                    'email' => $user->email,
                    'displayName' => $user->display_name,
                    'avatar' => $user->avatar,
                    'globalRole' => $user->global_role,
                    'status' => $user->status
                ]
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'JWT Token không hợp lệ hoặc đã hết hạn: ' . $e->getMessage()
            ], Response::HTTP_UNAUTHORIZED);
        }
    }

    /**
     * POST /api/extensions/cams/profile/update
     * Cập nhật hồ sơ và bắn sự kiện USER_PROFILE_UPDATED lên Redis Event Bus
     */
    public function updateProfile(Request $request)
    {
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json(['message' => 'Thiếu Token xác thực.'], Response::HTTP_UNAUTHORIZED);
        }

        $token = substr($authHeader, 7);
        $jwtSecret = env('JWT_SECRET', 'modular_os_cams_jwt_super_secret_key_2026_xyz');

        try {
            $decoded = JWT::decode($token, new Key($jwtSecret, 'HS256'));
            $user = User::findOrFail($decoded->sub ?? $decoded->user_id);
        } catch (Exception $e) {
            return response()->json(['message' => 'Token không hợp lệ.'], Response::HTTP_UNAUTHORIZED);
        }

        $request->validate([
            'displayName' => 'nullable|string|max:100',
            'avatar' => 'nullable|string|url',
        ]);

        if ($request->filled('displayName')) {
            $user->display_name = $request->input('displayName');
        }

        if ($request->filled('avatar')) {
            $user->avatar = $request->input('avatar');
        }

        $user->save();

        // BẮN SỰ KIỆN LÊN REDIS EVENT BUS (Anti-Mesh Backbone)
        $this->eventBus->publish(
            'USER_PROFILE_UPDATED',
            [
                'user_id' => $user->id,
                'uuid' => (string) $user->id,
                'email' => $user->email,
                'display_name' => $user->display_name,
                'avatar' => $user->avatar,
                'global_role' => $user->global_role,
            ],
            'cams'
        );

        return response()->json([
            'success' => true,
            'message' => 'Hồ sơ đã cập nhật và đồng bộ toàn hệ sinh thái.',
            'user' => [
                'id' => $user->id,
                'uuid' => (string) $user->id,
                'email' => $user->email,
                'displayName' => $user->display_name,
                'avatar' => $user->avatar,
                'globalRole' => $user->global_role,
            ]
        ]);
    }
}
