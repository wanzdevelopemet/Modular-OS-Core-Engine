<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Bảng extensions_registry (Danh bạ Tiện ích lõi Core Tools)
 * Lưu trữ trạng thái bật/tắt của các tiện ích hệ thống như CAMS, Notification Center,...
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extensions_registry', function (Blueprint $table) {
            $table->id();
            $table->string('identifier')->unique()->comment('Định danh duy nhất của Extension (VD: cams, notification-center)');
            $table->string('name')->comment('Tên tiện ích');
            $table->boolean('is_active')->default(true)->comment('Trạng thái hoạt động của Tiện ích');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extensions_registry');
    }
};

