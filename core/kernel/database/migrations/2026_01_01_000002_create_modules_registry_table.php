<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Bảng modules_registry (Danh bạ Module vệ tinh)
 * Đóng vai trò Service Discovery và Access Control List cho Micro-Frontend & Backend.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules_registry', function (Blueprint $table) {
            $table->id();
            $table->string('module_id')->unique()->comment('Mã định danh duy nhất của module (VD: shop-module)');
            $table->string('name')->comment('Tên hiển thị người dùng (VD: Cửa hàng trực tuyến)');
            
            // 3 ngàm cắm UI: federation (Vite), web-component, iframe
            $table->enum('frontend_type', ['federation', 'web-component', 'iframe'])
                  ->default('federation')
                  ->comment('Cơ chế tích hợp Micro-Frontend');
                  
            $table->string('remote_entry_url')->comment('Đường dẫn nạp bundle từ xa (remoteEntry.js / web-component.js / index.html)');
            
            // Khóa bí mật dùng để xác thực HMAC chữ ký số Zero-Trust
            $table->string('secret_key_hash')->comment('Hash hoặc API secret key để ký HMAC');
            
            $table->boolean('is_active')->default(true)->comment('Trạng thái kích hoạt (Kill-switch mềm)');
            $table->boolean('is_default_home')->default(false)->comment('Nếu true, module này sẽ chiếm quyền hiển thị trang chủ');
            $table->boolean('requires_auth')->default(false)->comment('Nếu true, bắt buộc phải có JWT Token hợp lệ khi tải/gọi API');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modules_registry');
    }
};

