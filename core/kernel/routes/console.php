<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('modular:health', function () {
    $this->info('Modular-OS Microkernel is operational.');
})->purpose('Kiểm tra trạng thái Microkernel CLI');

