<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\ModuleRegistry;
use App\Models\ExtensionRegistry;

class CoreAdminControllerTest extends TestCase
{
    public function test_list_modules(): void
    {
        $response = $this->getJson('/api/admin/modules');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'modules'
                 ]);
    }

    public function test_store_module(): void
    {
        $moduleId = 'test-crud-module-' . time();

        $response = $this->postJson('/api/admin/modules', [
            'module_id' => $moduleId,
            'name' => 'Test CRUD Module',
            'frontend_type' => 'federation',
            'url' => '/modules/test-crud/index.html',
            'secret_key' => 'secret_crud_123456',
            'requires_auth' => false,
            'is_active' => true
        ]);

        $response->assertStatus(201)
                 ->assertJson([
                     'success' => true,
                     'module' => [
                         'module_id' => $moduleId,
                         'name' => 'Test CRUD Module'
                     ]
                 ]);

        $this->assertDatabaseHas('modules_registry', [
            'module_id' => $moduleId
        ]);

        // Dọn dẹp
        ModuleRegistry::where('module_id', $moduleId)->delete();
    }

    public function test_toggle_module(): void
    {
        $module = ModuleRegistry::create([
            'module_id' => 'toggle-test-module-' . time(),
            'name' => 'Toggle Module',
            'frontend_type' => 'iframe',
            'url' => '/modules/toggle/index.html',
            'secret_key' => 'sec_toggle_123',
            'is_active' => true
        ]);

        // Đang true -> toggle thành false
        $res = $this->putJson("/api/admin/modules/{$module->id}/toggle");
        $res->assertStatus(200)
            ->assertJsonPath('module.is_active', false);

        // Đang false -> toggle thành true
        $res2 = $this->putJson("/api/admin/modules/{$module->id}/toggle");
        $res2->assertStatus(200)
             ->assertJsonPath('module.is_active', true);

        $module->delete();
    }

    public function test_set_and_unset_default_home(): void
    {
        $module = ModuleRegistry::create([
            'module_id' => 'home-test-module-' . time(),
            'name' => 'Home Test Module',
            'frontend_type' => 'web-component',
            'url' => '/modules/home/index.html',
            'secret_key' => 'sec_home_123',
            'is_default_home' => false
        ]);

        // Đặt làm default home
        $setRes = $this->putJson("/api/admin/modules/{$module->id}/set-home");
        $setRes->assertStatus(200)
               ->assertJsonPath('module.is_default_home', true);

        // Hủy default home
        $unsetRes = $this->putJson("/api/admin/modules/{$module->id}/unset-home");
        $unsetRes->assertStatus(200)
                 ->assertJsonPath('module.is_default_home', false);

        $module->delete();
    }

    public function test_list_and_toggle_extension(): void
    {
        $ext = ExtensionRegistry::firstOrCreate(
            ['identifier' => 'test-ext'],
            ['name' => 'Test Extension', 'is_active' => true]
        );

        $listRes = $this->getJson('/api/admin/extensions');
        $listRes->assertStatus(200)
                ->assertJsonStructure(['success', 'extensions']);

        $toggleRes = $this->putJson("/api/admin/extensions/{$ext->id}/toggle");
        $toggleRes->assertStatus(200);

        $ext->delete();
    }

    public function test_get_event_logs(): void
    {
        $response = $this->getJson('/api/admin/event-bus/logs');

        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'success',
                     'logs'
                 ]);
    }
}

