<?php

namespace Extensions\NotificationCenter\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Redis;

/**
 * NotificationController: Quản lý thông báo người dùng thời gian thực
 */
class NotificationController extends Controller
{
    public const NOTIFICATIONS_KEY = 'modular_os_user_notifications';

    /**
     * GET /api/extensions/notifications
     * Lấy danh sách thông báo mới nhất từ Redis Store
     */
    public function index(Request $request)
    {
        try {
            $rawList = Redis::lrange(self::NOTIFICATIONS_KEY, 0, 19);
            $notifications = array_map(fn($item) => json_decode($item, true), $rawList ?: []);
        } catch (\Exception $e) {
            $notifications = [];
        }

        return response()->json([
            'success' => true,
            'notifications' => $notifications
        ]);
    }

    /**
     * POST /api/extensions/notifications/send
     * Cho phép các extension hoặc admin chủ động đẩy thông báo
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'message' => 'required|string',
            'type' => 'nullable|string|in:info,success,warning,error'
        ]);

        $item = [
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'title' => $validated['title'],
            'message' => $validated['message'],
            'type' => $validated['type'] ?? 'info',
            'timestamp' => now()->toIso8601String()
        ];

        try {
            Redis::lpush(self::NOTIFICATIONS_KEY, json_encode($item));
            Redis::ltrim(self::NOTIFICATIONS_KEY, 0, 49);

            // Bắn lên Redis Pub/Sub thông báo cho các Frontend Client
            Redis::publish('modular_os_events:NOTIFICATION_SENT', json_encode($item));
        } catch (\Exception $e) {
            // Không làm gián đoạn
        }

        return response()->json([
            'success' => true,
            'notification' => $item
        ]);
    }
}

