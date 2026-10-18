<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ModuleRegistry;
use App\Models\ExtensionRegistry;
use App\Services\EventBusService;
use Symfony\Component\HttpFoundation\Response;

/**
 * AdminController: Quản trị hệ thống Microkernel dành riêng cho Super Admin
 * Hỗ trợ đầy đủ CRUD & Toggle cho Modules và Extensions.
 */
class AdminController extends Controller
{
    protected EventBusService $eventBus;

    public function __construct(EventBusService $eventBus)
    {
        $this->eventBus = $eventBus;
    }

    // =========================================================================
    // 1. MODULES REGISTRY MANAGEMENT
    // =========================================================================

    /**
     * GET /api/admin/modules
     * Lấy toàn bộ danh sách module (kể cả đang bị tắt)
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
     * Đăng ký module mới vào Core Registry
     */
    public function storeModule(Request $request)
    {
        $validated = $request->validate([
            'module_id' => 'required|string|max:100|unique:modules_registry,module_id',
            'name' => 'required|string|max:150',
            'frontend_type' => 'required|in:federation,web-component,iframe',
            'remote_entry_url' => 'required|string|max:500',
            'secret_key_hash' => 'required|string|max:255',
            'requires_auth' => 'boolean',
            'is_active' => 'boolean',
            'is_default_home' => 'boolean'
        ]);

        // Nếu đặt làm default home ngay từ đầu, xóa cờ default home của các module khác
        if (!empty($validated['is_default_home']) && $validated['is_default_home']) {
            ModuleRegistry::query()->update(['is_default_home' => false]);
        }

        $module = ModuleRegistry::create([
            'module_id' => $validated['module_id'],
            'name' => $validated['name'],
            'frontend_type' => $validated['frontend_type'],
            'remote_entry_url' => $validated['remote_entry_url'],
            'secret_key_hash' => $validated['secret_key_hash'],
            'requires_auth' => $validated['requires_auth'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'is_default_home' => $validated['is_default_home'] ?? false,
        ]);

        $this->eventBus->publish(
            'MODULE_REGISTERED',
            [
                'module_id' => $module->module_id,
                'name' => $module->name,
                'frontend_type' => $module->frontend_type
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
     * Cập nhật thông tin module
     */
    public function updateModule(Request $request, $id)
    {
        $module = ModuleRegistry::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'frontend_type' => 'sometimes|required|in:federation,web-component,iframe',
            'remote_entry_url' => 'sometimes|required|string|max:500',
            'secret_key_hash' => 'sometimes|required|string|max:255',
            'requires_auth' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean'
        ]);

        $module->update($validated);

        $this->eventBus->publish(
            'MODULE_UPDATED',
            ['module_id' => $module->module_id],
            'core-admin'
        );

        return response()->json([
            'success' => true,
            'message' => "Module [{$module->name}] đã được cập nhật thành công.",
            'module' => $module
        ]);
    }

    /**
     * DELETE /api/admin/modules/{id}
     * Xóa module khỏi Registry
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
     * Bật/Tắt module ngay lập tức (Kill-Switch quản trị)
     */
    public function toggleModule($id)
    {
        $module = ModuleRegistry::findOrFail($id);
        $module->is_active = !$module->is_active;

        // Nếu tắt module đang là trang chủ, hủy luôn trạng thái default home
        if (!$module->is_active && $module->is_default_home) {
            $module->is_default_home = false;
        }

        $module->save();

        // Bắn thông báo lên Event Bus để Shell tự động cập nhật UI tức thì
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
     * Thiết lập một module chiếm quyền hiển thị Trang chủ (Dual Homepage)
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

        // Xóa cờ default home của tất cả các module khác
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
     * Hủy quyền Trang chủ của module, trả hệ thống về giao diện Portal Hub dạng Grid
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
    // 2. EXTENSIONS REGISTRY MANAGEMENT (CAMS, Notifications, Tools)
    // =========================================================================

    /**
     * GET /api/admin/extensions
     * Lấy danh sách tất cả các tiện ích lõi
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
     * Đăng ký tiện ích mới
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
     * Bật/Tắt tiện ích lõi ngay lập tức
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
     * Gỡ bỏ tiện ích khỏi Registry
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
    // 3. EVENT BUS LOGS & REALTIME MONITORING
    // =========================================================================

    /**
     * GET /api/admin/event-bus/logs
     * Lấy danh sách sự kiện gần nhất từ Redis phục vụ màn hình Health & Event Bus
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
