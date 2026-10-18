<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ModuleRegistry;
use App\Models\ExtensionRegistry;
use App\Services\EventBusService;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Str;

/**
 * CoreAdminController: Quản trị hạt nhân Lõi Microkernel (Modular-OS)
 * Xử lý toàn bộ thao tác CRUD và Toggle trạng thái cho Modules & Extensions.
 */
class CoreAdminController extends Controller
{
    protected EventBusService $eventBus;

    public function __construct(EventBusService $eventBus)
    {
        $this->eventBus = $eventBus;
    }

    // =========================================================================
    // 1. MODULES REGISTRY CRUD & TOGGLE
    // =========================================================================

    /**
     * GET /api/admin/modules
     */
    public function listModules()
    {
        $modules = ModuleRegistry::orderBy('id', 'desc')->get();
        return response()->json([
            'success' => true,
            'modules' => $modules
        ]);
    }

    /**
     * POST /api/admin/modules
     */
    public function storeModule(Request $request)
    {
        $validated = $request->validate([
            'module_id' => 'required|string|max:100|unique:modules_registry,module_id',
            'name' => 'required|string|max:150',
            'frontend_type' => 'nullable|in:federation,web-component,iframe',
            'url' => 'nullable|string|max:500',
            'remote_entry_url' => 'nullable|string|max:500',
            'secret_key' => 'nullable|string|max:255',
            'secret_key_hash' => 'nullable|string|max:255',
            'requires_auth' => 'boolean',
            'is_active' => 'boolean',
            'is_default_home' => 'boolean'
        ]);

        $url = $validated['url'] ?? $validated['remote_entry_url'] ?? '';
        $secretKey = $validated['secret_key'] ?? $validated['secret_key_hash'] ?? Str::random(32);

        // Nếu đặt làm default home ngay từ đầu, xóa cờ của các module khác
        if (!empty($validated['is_default_home']) && $validated['is_default_home']) {
            ModuleRegistry::query()->update(['is_default_home' => false]);
        }

        $module = ModuleRegistry::create([
            'module_id' => $validated['module_id'],
            'name' => $validated['name'],
            'frontend_type' => $validated['frontend_type'] ?? 'federation',
            'url' => $url,
            'remote_entry_url' => $url,
            'secret_key' => $secretKey,
            'secret_key_hash' => $secretKey,
            'requires_auth' => $validated['requires_auth'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'is_default_home' => $validated['is_default_home'] ?? false,
        ]);

        $this->eventBus->publish(
            'MODULE_REGISTERED',
            [
                'module_id' => $module->module_id,
                'name' => $module->name,
                'url' => $module->url
            ],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Module [{$module->name}] đã được đăng ký thành công vào hệ sinh thái.",
            'module' => $module
        ], Response::HTTP_CREATED);
    }

    /**
     * PUT /api/admin/modules/{id}
     */
    public function updateModule(Request $request, $id)
    {
        $module = ModuleRegistry::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'frontend_type' => 'sometimes|required|in:federation,web-component,iframe',
            'url' => 'sometimes|nullable|string|max:500',
            'remote_entry_url' => 'sometimes|nullable|string|max:500',
            'secret_key' => 'sometimes|nullable|string|max:255',
            'secret_key_hash' => 'sometimes|nullable|string|max:255',
            'requires_auth' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean'
        ]);

        if (isset($validated['url'])) {
            $validated['remote_entry_url'] = $validated['url'];
        } elseif (isset($validated['remote_entry_url'])) {
            $validated['url'] = $validated['remote_entry_url'];
        }

        if (isset($validated['secret_key'])) {
            $validated['secret_key_hash'] = $validated['secret_key'];
        } elseif (isset($validated['secret_key_hash'])) {
            $validated['secret_key'] = $validated['secret_key_hash'];
        }

        $module->update($validated);

        $this->eventBus->publish(
            'MODULE_UPDATED',
            ['module_id' => $module->module_id],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Module [{$module->name}] đã được cập nhật.",
            'module' => $module
        ]);
    }

    /**
     * DELETE /api/admin/modules/{id}
     */
    public function deleteModule($id)
    {
        $module = ModuleRegistry::findOrFail($id);
        $moduleId = $module->module_id;
        $moduleName = $module->name;

        $module->delete();

        $this->eventBus->publish(
            'MODULE_DELETED',
            ['module_id' => $moduleId],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Module [{$moduleName}] đã được gỡ bỏ khỏi hệ sinh thái."
        ]);
    }

    /**
     * PUT /api/admin/modules/{id}/toggle
     */
    public function toggleModule($id)
    {
        $module = ModuleRegistry::findOrFail($id);
        $module->is_active = !$module->is_active;

        if (!$module->is_active && $module->is_default_home) {
            $module->is_default_home = false;
        }

        $module->save();

        $this->eventBus->publish(
            'MODULE_STATUS_CHANGED',
            [
                'module_id' => $module->module_id,
                'is_active' => $module->is_active
            ],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Module [{$module->name}] hiện đang " . ($module->is_active ? 'BẬT' : 'TẮT'),
            'module' => $module
        ]);
    }

    /**
     * PUT /api/admin/modules/{id}/set-home
     */
    public function setDefaultHome($id)
    {
        $targetModule = ModuleRegistry::findOrFail($id);

        if (!$targetModule->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể đặt module đã bị tắt làm Trang chủ.'
            ], Response::HTTP_BAD_REQUEST);
        }

        ModuleRegistry::where('id', '!=', $id)->update(['is_default_home' => false]);

        $targetModule->is_default_home = true;
        $targetModule->save();

        $this->eventBus->publish(
            'MODULE_HOME_CHANGED',
            ['module_id' => $targetModule->module_id],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Đã đặt module [{$targetModule->name}] làm Trang chủ mặc định.",
            'module' => $targetModule
        ]);
    }

    /**
     * PUT /api/admin/modules/{id}/unset-home
     */
    public function unsetDefaultHome($id)
    {
        $targetModule = ModuleRegistry::findOrFail($id);
        $targetModule->is_default_home = false;
        $targetModule->save();

        $this->eventBus->publish(
            'MODULE_HOME_CHANGED',
            ['module_id' => null],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Đã hủy Trang chủ riêng. Hệ thống trở về Cổng tổng Portal Hub.",
            'module' => $targetModule
        ]);
    }

    // =========================================================================
    // 2. EXTENSIONS MANAGEMENT CRUD & TOGGLE
    // =========================================================================

    /**
     * GET /api/admin/extensions
     */
    public function listExtensions()
    {
        $extensions = ExtensionRegistry::orderBy('id', 'asc')->get();
        return response()->json([
            'success' => true,
            'extensions' => $extensions
        ]);
    }

    /**
     * POST /api/admin/extensions
     */
    public function storeExtension(Request $request)
    {
        $validated = $request->validate([
            'identifier' => 'required|string|max:100|unique:extensions_registry,identifier',
            'name' => 'required|string|max:150',
            'is_active' => 'boolean'
        ]);

        $extension = ExtensionRegistry::create([
            'identifier' => $validated['identifier'],
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true
        ]);

        $this->eventBus->publish(
            'EXTENSION_REGISTERED',
            ['identifier' => $extension->identifier],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Tiện ích lõi [{$extension->name}] đã được đăng ký thành công.",
            'extension' => $extension
        ], Response::HTTP_CREATED);
    }

    /**
     * PUT /api/admin/extensions/{id}/toggle
     */
    public function toggleExtension($id)
    {
        $extension = ExtensionRegistry::findOrFail($id);
        $extension->is_active = !$extension->is_active;
        $extension->save();

        $this->eventBus->publish(
            'EXTENSION_STATUS_CHANGED',
            [
                'identifier' => $extension->identifier,
                'is_active' => $extension->is_active
            ],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Tiện ích [{$extension->name}] hiện đang " . ($extension->is_active ? 'BẬT' : 'TẮT'),
            'extension' => $extension
        ]);
    }

    /**
     * DELETE /api/admin/extensions/{id}
     */
    public function deleteExtension($id)
    {
        $extension = ExtensionRegistry::findOrFail($id);
        $name = $extension->name;
        $extension->delete();

        return response()->json([
            'success' => true,
            'message' => "Tiện ích [{$name}] đã được xóa khỏi Registry."
        ]);
    }

    // =========================================================================
    // 3. EVENT BUS LOGS
    // =========================================================================

    /**
     * GET /api/admin/event-bus/logs
     */
    public function getEventLogs()
    {
        $logs = $this->eventBus->getRecentEvents(50);
        return response()->json([
            'success' => true,
            'count' => count($logs),
            'logs' => $logs
        ]);
    }
}

