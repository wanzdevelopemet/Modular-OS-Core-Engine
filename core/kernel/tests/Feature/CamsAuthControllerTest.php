<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class CamsAuthControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Xóa sạch user admin mẫu trước mỗi bài test để kiểm tra auto-bootstrap
        User::where('email', 'admin@modular-os.internal')->delete();
    }

    /**
     * Kiểm tra cơ chế Guard bảo vệ: Không tự động tạo super admin khi CAMS_SUPERADMIN_ENABLED=false
     */
    public function test_superadmin_auto_creation_blocked_when_env_disabled(): void
    {
        putenv('CAMS_SUPERADMIN_ENABLED=false');
        $_ENV['CAMS_SUPERADMIN_ENABLED'] = 'false';

        $response = $this->postJson('/api/extensions/cams/login', [
            'email' => 'admin@modular-os.internal',
            'password' => 'admin123'
        ]);

        $response->assertStatus(401)
                 ->assertJson([
                     'success' => false,
                     'message' => 'Email hoặc mật khẩu không chính xác.'
                 ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'admin@modular-os.internal'
        ]);
    }

    /**
     * Kiểm tra tự động tạo super admin và phát hành JWT khi CAMS_SUPERADMIN_ENABLED=true
     */
    public function test_superadmin_auto_creation_and_jwt_generation_when_env_enabled(): void
    {
        putenv('CAMS_SUPERADMIN_ENABLED=true');
        $_ENV['CAMS_SUPERADMIN_ENABLED'] = 'true';
        putenv('CAMS_SUPERADMIN_PASSWORD=admin123');
        $_ENV['CAMS_SUPERADMIN_PASSWORD'] = 'admin123';

        $response = $this->postJson('/api/extensions/cams/login', [
            'email' => 'admin@modular-os.internal',
            'password' => 'admin123'
        ]);

        $response->assertStatus(200)
                 ->assertJson([
                     'success' => true,
                     'expires_in' => 28800
                 ])
                 ->assertJsonStructure([
                     'token',
                     'user' => [
                         'id',
                         'uuid',
                         'email',
                         'displayName',
                         'globalRole'
                     ]
                 ]);

        // Xác minh JWT token hợp lệ và chứa đúng claims exp (8h), iat, role
        $token = $response->json('token');
        $jwtSecret = env('JWT_SECRET', 'testing_modular_os_cams_jwt_secret_xyz123');
        $decoded = JWT::decode($token, new Key($jwtSecret, 'HS256'));

        $this->assertEquals((string) $response->json('user.id'), (string) $decoded->sub);
        $this->assertEquals('super_admin', $decoded->role);
        $this->assertNotNull($decoded->iat);
        $this->assertNotNull($decoded->exp);
        $this->assertEquals(28800, $decoded->exp - $decoded->iat);
    }

    /**
     * Kiểm tra endpoint /me với Bearer Token
     */
    public function test_cams_me_endpoint_with_valid_and_missing_token(): void
    {
        // 1. Thất bại nếu không có token
        $resNoAuth = $this->getJson('/api/extensions/cams/me');
        $resNoAuth->assertStatus(401);

        // 2. Tạo user test
        $user = User::create([
            'email' => 'testuser@modular-os.internal',
            'password' => Hash::make('secret123'),
            'display_name' => 'Tester',
            'global_role' => 'user',
            'status' => 'active'
        ]);

        $jwtSecret = env('JWT_SECRET', 'testing_modular_os_cams_jwt_secret_xyz123');
        $token = JWT::encode([
            'sub' => (string) $user->id,
            'user_id' => $user->id,
            'role' => 'user',
            'iat' => time(),
            'exp' => time() + 3600
        ], $jwtSecret, 'HS256');

        $resAuth = $this->withHeader('Authorization', 'Bearer ' . $token)
                        ->getJson('/api/extensions/cams/me');

        $resAuth->assertStatus(200)
                ->assertJson([
                    'success' => true,
                    'user' => [
                        'email' => 'testuser@modular-os.internal',
                        'displayName' => 'Tester'
                    ]
                ]);

        $user->delete();
    }
}

