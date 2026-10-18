<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ModuleRegistryController;
use App\Http\Controllers\EventBusController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\CoreAdminController;
use App\Http\Middleware\GatekeeperMiddleware;

/*
|--------------------------------------------------------------------------
| Modular-OS Microkernel API Routes
|--------------------------------------------------------------------------
| Toàn bộ API của lõi hệ thống được định nghĩa tại đây.
| Tuyệt đối không chứa logic của Module con (Sản phẩm, Đơn hàng, Bài viết...).
*/

// 1. HEALTH CHECK & METRICS (Công khai)
Route::get('/health', [ModuleRegistryController::class, 'health']);

// 2. DISCOVERY SERVICE: Dành cho React Host Shell lấy danh sách modules
Route::get('/modules', [ModuleRegistryController::class, 'index']);

// 3. ZERO-TRUST EVENT BUS GATEWAY & REALTIME MULTI-CLIENT STREAM
// Kênh nạp sự kiện (yêu cầu GatekeeperMiddleware: X-Module-ID + HMAC Signature)
Route::middleware([GatekeeperMiddleware::class])->group(function () {
    Route::post('/event-bus/publish', [EventBusController::class, 'publish']);
});

// Kênh phân phối sự kiện thời gian thực đa máy khách (Server-Sent Events)
Route::get('/events/stream', [EventBusController::class, 'stream']);

// 4. CORE ADMIN ENDPOINTS
// Phục vụ giao diện Quản lý Module, Extensions và Giám sát Health / Event Bus (/core-admin)
Route::prefix('admin')->group(function () {
    // Quản lý Modules (Full CRUD + Toggles)
    Route::get('/modules', [CoreAdminController::class, 'listModules']);
    Route::post('/modules', [CoreAdminController::class, 'storeModule']);
    Route::put('/modules/{id}', [CoreAdminController::class, 'updateModule']);
    Route::delete('/modules/{id}', [CoreAdminController::class, 'deleteModule']);
    Route::put('/modules/{id}/toggle', [CoreAdminController::class, 'toggleModule']);
    Route::put('/modules/{id}/set-home', [CoreAdminController::class, 'setDefaultHome']);
    Route::put('/modules/{id}/unset-home', [CoreAdminController::class, 'unsetDefaultHome']);

    // Quản lý Extensions (Full CRUD + Toggles)
    Route::get('/extensions', [CoreAdminController::class, 'listExtensions']);
    Route::post('/extensions', [CoreAdminController::class, 'storeExtension']);
    Route::put('/extensions/{id}/toggle', [CoreAdminController::class, 'toggleExtension']);
    Route::delete('/extensions/{id}', [CoreAdminController::class, 'deleteExtension']);

    // Giám sát Event Bus Logs
    Route::get('/event-bus/logs', [CoreAdminController::class, 'getEventLogs']);
});
