<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cập nhật bảng modules_registry với các trường url và secret_key
        if (Schema::hasTable('modules_registry')) {
            Schema::table('modules_registry', function (Blueprint $table) {
                if (!Schema::hasColumn('modules_registry', 'url')) {
                    $table->string('url', 500)->nullable()->after('name');
                }
                if (!Schema::hasColumn('modules_registry', 'secret_key')) {
                    $table->string('secret_key', 255)->nullable()->after('url');
                }
            });

            // Đồng bộ dữ liệu hiện có từ remote_entry_url và secret_key_hash
            \Illuminate\Support\Facades\DB::statement(
                'UPDATE modules_registry SET url = remote_entry_url WHERE url IS NULL'
            );
            \Illuminate\Support\Facades\DB::statement(
                'UPDATE modules_registry SET secret_key = secret_key_hash WHERE secret_key IS NULL'
            );
        }

        // 2. Tạo bảng extensions nếu chưa có
        if (!Schema::hasTable('extensions')) {
            Schema::create('extensions', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('identifier')->unique();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });

            // Copy dữ liệu từ extensions_registry sang extensions nếu có
            if (Schema::hasTable('extensions_registry')) {
                \Illuminate\Support\Facades\DB::statement(
                    'INSERT IGNORE INTO extensions (id, name, identifier, is_active, created_at, updated_at) 
                     SELECT id, name, identifier, is_active, created_at, updated_at FROM extensions_registry'
                );
            }
        }
    }

    public function down(): void
    {
        //
    }
};

