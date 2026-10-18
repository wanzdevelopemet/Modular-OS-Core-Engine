<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use App\Models\ExtensionRegistry;

/**
 * ExtensionServiceProvider: Bộ nạp động các Tiện ích lõi (Core Extensions)
 * 
 * Cơ chế hoạt động:
 * 1. Quét toàn bộ thư mục con trong `core/extensions/`.
 * 2. Đọc tệp mô tả `extension.json`.
 * 3. Kiểm tra trạng thái kích hoạt trong DB (extensions_registry).
 * 4. Tự động đăng ký Routes, Migrations, Views và Event Listeners của extension vào Kernel.
 */
class ExtensionServiceProvider extends ServiceProvider
{
    /**
     * Thư mục chứa các extensions của Modular-OS
     */
    protected string $extensionsBasePath;

    public function register(): void
    {
        $this->extensionsBasePath = base_path('core/extensions');
    }

    public function boot(): void
    {
        if (!File::isDirectory($this->extensionsBasePath)) {
            File::makeDirectory($this->extensionsBasePath, 0755, true, true);
            return;
        }

        // Lấy danh sách tất cả các thư mục tiện ích trong core/extensions/
        $extensionDirectories = File::directories($this->extensionsBasePath);

        foreach ($extensionDirectories as $dir) {
            $this->loadExtensionFromDirectory($dir);
        }
    }

    /**
     * Nạp từng extension cụ thể dựa theo manifest extension.json
     */
    protected function loadExtensionFromDirectory(string $directory): void
    {
        $manifestPath = $directory . DIRECTORY_SEPARATOR . 'extension.json';

        if (!File::exists($manifestPath)) {
            return;
        }

        $manifestContent = json_decode(File::get($manifestPath), true);
        if (!$manifestContent || empty($manifestContent['identifier'])) {
            Log::warning("Extension manifest không hợp lệ tại: {$manifestPath}");
            return;
        }

        $identifier = $manifestContent['identifier'];
        $name = $manifestContent['name'] ?? $identifier;

        // Tự động đồng bộ vào bảng extensions_registry nếu chưa có
        try {
            $extensionRecord = ExtensionRegistry::firstOrCreate(
                ['identifier' => $identifier],
                ['name' => $name, 'is_active' => true]
            );

            // Nếu tiện ích bị vô hiệu hóa bởi Admin, bỏ qua không nạp
            if (!$extensionRecord->is_active) {
                Log::info("Extension [{$identifier}] đang ở trạng thái Tắt (Deactivated).");
                return;
            }
        } catch (\Exception $e) {
            // Trường hợp DB chưa chạy migration lần đầu, vẫn tiếp tục để không crash hệ thống
        }

        // 1. TỰ ĐỘNG NẠP MIGRATIONS
        $migrationsPath = $directory . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'migrations';
        if (File::isDirectory($migrationsPath)) {
            $this->loadMigrationsFrom($migrationsPath);
        }

        // 2. TỰ ĐỘNG NẠP API ROUTES
        $apiRoutesPath = $directory . DIRECTORY_SEPARATOR . 'routes' . DIRECTORY_SEPARATOR . 'api.php';
        if (File::exists($apiRoutesPath)) {
            $prefix = $manifestContent['routes_prefix'] ?? "api/extensions/{$identifier}";
            Route::prefix($prefix)
                ->middleware(['api'])
                ->group($apiRoutesPath);
        }

        // 3. TỰ ĐỘNG NẠP WEB ROUTES
        $webRoutesPath = $directory . DIRECTORY_SEPARATOR . 'routes' . DIRECTORY_SEPARATOR . 'web.php';
        if (File::exists($webRoutesPath)) {
            Route::middleware(['web'])->group($webRoutesPath);
        }

        // 4. TỰ ĐỘNG NẠP VÀ ĐĂNG KÝ EVENT LISTENERS
        if (!empty($manifestContent['listeners']) && is_array($manifestContent['listeners'])) {
            foreach ($manifestContent['listeners'] as $eventName => $listenerClass) {
                if (class_exists($listenerClass)) {
                    Event::listen($eventName, $listenerClass);
                }
            }
        }

        Log::info("Nạp thành công Core Extension: [{$identifier}] - {$name}");
    }
}

