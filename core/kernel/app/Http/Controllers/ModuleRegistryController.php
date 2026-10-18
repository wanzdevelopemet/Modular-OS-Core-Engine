<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ModuleRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

/**
 * ModuleRegistryController: Cung cấp danh sách Module cho Host Shell & Health Check
 */
class ModuleRegistryController extends Controller
{
    /**
     * GET /api/modules
     * Trả về danh sách các module đang active cho React Host Shell dựng AppRouter
     */
    public function index()
    {
        $modules = ModuleRegistry::active()
            ->select([
                'id',
                'module_id',
                'name',
                'frontend_type',
                'remote_entry_url',
                'is_active',
                'is_default_home',
                'requires_auth',
            ])
            ->get();

        return response()->json([
            'success' => true,
            'modules' => $modules,
            'default_home' => $modules->firstWhere('is_default_home', true)
        ]);
    }

    /**
     * GET /api/health
     * Kiểm tra trạng thái hoạt động của các thành phần Microkernel (MySQL, Redis)
     */
    public function health()
    {
        $status = [
            'kernel' => 'healthy',
            'php_version' => PHP_VERSION,
            'timestamp' => now()->toIso8601String(),
            'database' => 'disconnected',
            'redis' => 'disconnected',
        ];

        try {
            DB::connection()->getPdo();
            $status['database'] = 'connected';
        } catch (\Exception $e) {
            $status['database'] = 'error: ' . $e->getMessage();
        }

        try {
            Redis::ping();
            $status['redis'] = 'connected';
        } catch (\Exception $e) {
            $status['redis'] = 'error: ' . $e->getMessage();
        }

        $isOk = $status['database'] === 'connected' && $status['redis'] === 'connected';

        return response()->json([
            'status' => $isOk ? 'ok' : 'degraded',
            'checks' => $status
        ], $isOk ? 200 : 503);
    }
}

