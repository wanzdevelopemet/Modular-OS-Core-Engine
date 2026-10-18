<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Bảng users hạt nhân của hệ thống (CAMS Core Authentication)
 * Không chứa thông tin nghiệp vụ đặc thù của shop/diễn đàn (như giỏ hàng, điểm thưởng).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->string('display_name');
            $table->string('avatar')->nullable();
            
            // Phân quyền lõi: super_admin (quản trị kernel), admin, user
            $table->enum('global_role', ['super_admin', 'admin', 'user'])->default('user');
            
            // Trạng thái tài khoản: active, inactive, banned
            $table->enum('status', ['active', 'inactive', 'banned'])->default('active');
            
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};

