<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'framework' => 'Modular-OS Microkernel',
        'version' => '1.0.0',
        'status' => 'operational'
    ]);
});

