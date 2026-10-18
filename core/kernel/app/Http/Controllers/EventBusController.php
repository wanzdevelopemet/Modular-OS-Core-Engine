<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\EventBusService;

/**
 * EventBusController: API tiếp nhận sự kiện từ các module vệ tinh
 * Toàn bộ route này bắt buộc phải đi qua GatekeeperMiddleware (HMAC + Zero-Trust)
 */
class EventBusController extends Controller
{
    protected EventBusService $eventBus;

    public function __construct(EventBusService $eventBus)
    {
        $this->eventBus = $eventBus;
    }

    /**
     * POST /api/event-bus/publish
     * Tiếp nhận payload sự kiện và phân phối vào Redis Event Bus
     */
    public function publish(Request $request)
    {
        $validated = $request->validate([
            'event' => 'required|string|max:100',
            'payload' => 'present|array',
        ]);

        // Module đã được GatekeeperMiddleware xác thực và đính kèm vào Request attributes
        $currentModule = $request->attributes->get('current_module');
        $sourceModuleId = $currentModule ? $currentModule->module_id : 'unknown';

        $event = $this->eventBus->publish(
            $validated['event'],
            $validated['payload'],
            $sourceModuleId
        );

        return response()->json([
            'success' => true,
            'message' => "Sự kiện [{$validated['event']}] đã được phát tán thành công qua Redis Event Bus.",
            'event' => $event
        ], Response::HTTP_CREATED);
    }

    /**
     * GET /api/events/stream
     * Server-Sent Events (SSE) Stream đăng ký nhận tin từ Redis Pub/Sub và đẩy trực tiếp về các client
     */
    public function stream(Request $request)
    {
        return response()->stream(function () {
            // Thiết lập môi trường không timeout cho SSE
            @ini_set('default_socket_timeout', -1);
            @ini_set('max_execution_time', 0);
            if (function_exists('set_time_limit')) {
                @set_time_limit(0);
            }
            if (function_exists('ignore_user_abort')) {
                @ignore_user_abort(true);
            }

            // Xóa toàn bộ output buffers hiện hữu
            while (ob_get_level()) {
                ob_end_flush();
            }
            flush();

            // Gửi frame handshake đầu tiên xác nhận kết nối SSE thành công
            echo ": connected\n\n";
            echo "event: endpoint_connected\ndata: " . json_encode([
                'status' => 'connected',
                'stream' => 'Redis Pub/Sub SSE',
                'timestamp' => now()->toIso8601String()
            ]) . "\n\n";
            flush();

            try {
                // Đăng ký nhận tin thời gian thực từ kênh chính của Event Bus
                \Illuminate\Support\Facades\Redis::subscribe([EventBusService::MAIN_CHANNEL], function ($message) {
                    echo "event: MODULAR_OS_EVENT\n";
                    echo "data: {$message}\n\n";
                    flush();

                    // Nếu client đóng kết nối trình duyệt thì giải phóng socket
                    if (connection_aborted()) {
                        exit();
                    }
                });
            } catch (\Throwable $e) {
                // Thoát khi client ngắt kết nối hoặc có tín hiệu dừng
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-transform',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}

