<?php

use Illuminate\Support\Facades\Route;
use Extensions\Cams\Controllers\CamsAuthController;

/*
|--------------------------------------------------------------------------
| CAMS Extension API Routes
|--------------------------------------------------------------------------
| Tự động được nạp bởi ExtensionServiceProvider với prefix /api/extensions/cams
*/

Route::post('/login', [CamsAuthController::class, 'login']);
Route::get('/me', [CamsAuthController::class, 'me']);
Route::post('/profile/update', [CamsAuthController::class, 'updateProfile']);
