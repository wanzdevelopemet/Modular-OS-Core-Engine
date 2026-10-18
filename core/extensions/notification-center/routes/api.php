<?php

use Illuminate\Support\Facades\Route;
use Extensions\NotificationCenter\Controllers\NotificationController;

/*
|--------------------------------------------------------------------------
| Notification Center Extension API Routes
|--------------------------------------------------------------------------
| Tự động được nạp bởi ExtensionServiceProvider với prefix /api/extensions/notifications
*/

Route::get('/', [NotificationController::class, 'index']);
Route::post('/send', [NotificationController::class, 'send']);

