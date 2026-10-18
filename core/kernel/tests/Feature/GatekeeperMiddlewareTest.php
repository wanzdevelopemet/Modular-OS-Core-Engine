<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\ModuleRegistry;

class GatekeeperMiddlewareTest extends TestCase
{
    protected string $testModuleId = 'test-gatekeeper-module';
    protected string $rawSecretKey = 'test_secret_key_123456';
    protected ?ModuleRegistry $module = null;

    protected function setUp(): void
    {
        parent::setUp();

        ModuleRegistry::where('module_id', $this->testModuleId)->delete();

        // Tạo module thử nghiệm với fallback secret_key (secret_key_hash để null)
        $this->module = ModuleRegistry::create([
            'module_id' => $this->testModuleId,
            'name' => 'Gatekeeper Test Module',
            'frontend_type' => 'federation',
            'url' => '/modules/test/index.html',
            'remote_entry_url' => '/modules/test/index.html',
            'secret_key' => $this->rawSecretKey,
            'secret_key_hash' => null,
            'is_active' => true,
            'requires_auth' => false
        ]);
    }

    protected function tearDown(): void
    {
        if ($this->module) {
            $this->module->delete();
        }
        parent::tearDown();
    }

    public function test_missing_module_id_rejected(): void
    {
        $response = $this->postJson('/api/event-bus/publish', [
            'event' => 'TEST_EVENT',
            'payload' => ['foo' => 'bar']
        ]);

        $response->assertStatus(403)
                 ->assertJson([
                     'success' => false,
                     'error_code' => 'MISSING_MODULE_ID'
                 ]);
    }

    public function test_inactive_or_unknown_module_rejected(): void
    {
        $response = $this->withHeader('X-Module-ID', 'non-existent-module')
                         ->postJson('/api/event-bus/publish', [
                             'event' => 'TEST_EVENT',
                             'payload' => []
                         ]);

        $response->assertStatus(403)
                 ->assertJson([
                     'success' => false,
                     'error_code' => 'UNAUTHORIZED_OR_INACTIVE_MODULE'
                 ]);
    }

    public function test_missing_hmac_signature_rejected(): void
    {
        $response = $this->withHeader('X-Module-ID', $this->testModuleId)
                         ->postJson('/api/event-bus/publish', [
                             'event' => 'TEST_EVENT',
                             'payload' => []
                         ]);

        $response->assertStatus(403)
                 ->assertJson([
                     'success' => false,
                     'error_code' => 'MISSING_HMAC_SIGNATURE'
                 ]);
    }

    public function test_invalid_hmac_signature_rejected(): void
    {
        $timestamp = (string) time();
        $response = $this->withHeaders([
            'X-Module-ID' => $this->testModuleId,
            'X-HMAC-Signature' => 'fake_invalid_signature_hex_xyz',
            'X-Timestamp' => $timestamp
        ])->postJson('/api/event-bus/publish', [
            'event' => 'TEST_EVENT',
            'payload' => []
        ]);

        $response->assertStatus(403)
                 ->assertJson([
                     'success' => false,
                     'error_code' => 'INVALID_HMAC_SIGNATURE'
                 ]);
    }

    public function test_replay_attack_rejected_when_timestamp_skewed(): void
    {
        $oldTimestamp = (string) (time() - 400); // Lệch quá 300s
        $data = ['event' => 'TEST_EVENT', 'payload' => []];
        $payload = json_encode($data);
        $sig = hash_hmac('sha256', "{$payload}:{$oldTimestamp}", $this->rawSecretKey);

        $response = $this->withHeaders([
            'X-Module-ID' => $this->testModuleId,
            'X-HMAC-Signature' => $sig,
            'X-Timestamp' => $oldTimestamp
        ])->postJson('/api/event-bus/publish', $data);

        $response->assertStatus(403)
                 ->assertJson([
                     'success' => false,
                     'error_code' => 'REPLAY_ATTACK_DETECTED'
                 ]);
    }

    public function test_valid_hmac_signature_passes_via_fallback_to_secret_key(): void
    {
        $timestamp = (string) time();
        $data = ['event' => 'TEST_EVENT_PASSED', 'payload' => ['status' => 'ok']];
        $payload = json_encode($data);
        
        // Ký bằng chuẩn @modular-os/bridge: body:timestamp
        $signature = hash_hmac('sha256', "{$payload}:{$timestamp}", $this->rawSecretKey);

        $response = $this->withHeaders([
            'X-Module-ID' => $this->testModuleId,
            'X-HMAC-Signature' => $signature,
            'X-Timestamp' => $timestamp
        ])->postJson('/api/event-bus/publish', $data);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true
                 ])
                 ->assertJsonPath('event.source_module', $this->testModuleId);
    }
}
