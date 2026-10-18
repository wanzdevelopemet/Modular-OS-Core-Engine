<?php

namespace App\Services;

use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;

/**
 * EventBusService: Trung tâm điều phối sự kiện Pub/Sub (Anti-Mesh Backbone)
 * 
 * Đảm bảo các module không gọi API chéo nhau mà giao tiếp hoàn toàn qua Redis.
 */
class EventBusService
{
    public const MAIN_CHANNEL = 'modular_os_events';
    public const EVENT_LOG_KEY = 'modular_os_event_history';

    /**
     * Phát sự kiện lên Redis Pub/Sub và lưu lịch sử vào Redis List phục vụ Admin Dashboard
     */
    public function publish(string $eventName, array $payload, string $sourceModuleId): array
    {
        $eventData = [
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'event' => $eventName,
            'source_module' => $sourceModuleId,
            'payload' => $payload,
            'timestamp' => now()->toIso8601String(),
            'epoch_ms' => round(microtime(true) * 1000)
        ];

        $jsonEncoded = json_encode($eventData);

        try {
            // 1. Bắn lên Redis Pub/Sub cho các tiến trình đang lắng nghe (subscribers)
            Redis::publish(self::MAIN_CHANNEL, $jsonEncoded);
            Redis::publish("modular_os_events:{$eventName}", $jsonEncoded);

            // 2. Lưu tối đa 100 sự kiện gần nhất vào Redis List để Admin xem Live Stream Logs
            Redis::lpush(self::EVENT_LOG_KEY, $jsonEncoded);
            Redis::ltrim(self::EVENT_LOG_KEY, 0, 99);

            Log::info("Event Bus [{$eventName}] phát đi từ module [{$sourceModuleId}]");
        } catch (\Exception $e) {
            Log::error("Lỗi khi phát sự kiện lên Redis: " . $e->getMessage());
            throw $e;
        }

        return $eventData;
    }

    /**
     * Lấy danh sách lịch sử các sự kiện gần đây cho Admin Dashboard
     */
    public function getRecentEvents(int $limit = 50): array
    {
        try {
            $rawEvents = Redis::lrange(self::EVENT_LOG_KEY, 0, $limit - 1);
            return array_map(fn($item) => json_decode($item, true), $rawEvents ?: []);
        } catch (\Exception $e) {
            Log::warning("Không thể đọc lịch sử event từ Redis: " . $e->getMessage());
            return [];
        }
    }
}

