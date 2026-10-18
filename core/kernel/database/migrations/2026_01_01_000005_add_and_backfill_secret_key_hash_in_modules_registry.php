<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Migration: Bổ sung và đồng bộ trường secret_key_hash cho modules_registry
 * Đảm bảo Zero-Trust Security: backfill bằng bcrypt hash cho các secret key hiện có và cho phép nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('modules_registry')) {
            // 1. Thêm hoặc cập nhật cột secret_key_hash là nullable
            if (!Schema::hasColumn('modules_registry', 'secret_key_hash')) {
                Schema::table('modules_registry', function (Blueprint $table) {
                    $table->string('secret_key_hash', 255)->nullable()->after('secret_key')->comment('Bcrypt hash của secret_key để lưu trữ an toàn');
                });
            } else {
                try {
                    Schema::table('modules_registry', function (Blueprint $table) {
                        $table->string('secret_key_hash', 255)->nullable()->change();
                    });
                } catch (\Throwable $e) {
                    DB::statement('ALTER TABLE modules_registry MODIFY COLUMN secret_key_hash VARCHAR(255) NULL');
                }
            }

            // 2. Backfill: băm giá trị secret_key hiện có bằng Hash::make()
            $modules = DB::table('modules_registry')->get();
            foreach ($modules as $module) {
                $rawSecret = $module->secret_key ?? null;

                // Nếu secret_key trống nhưng secret_key_hash có giá trị thô (chưa phải bcrypt)
                if (empty($rawSecret) && !empty($module->secret_key_hash) && !str_starts_with($module->secret_key_hash, '$2y$')) {
                    $rawSecret = $module->secret_key_hash;
                }

                if (!empty($rawSecret)) {
                    $updates = [];

                    // Đồng bộ lại secret_key nếu đang thiếu
                    if (empty($module->secret_key)) {
                        $updates['secret_key'] = $rawSecret;
                    }

                    // Nếu secret_key_hash chưa có hoặc chưa được băm bằng bcrypt
                    if (empty($module->secret_key_hash) || !str_starts_with($module->secret_key_hash, '$2y$')) {
                        $updates['secret_key_hash'] = Hash::make($rawSecret);
                    }

                    if (!empty($updates)) {
                        DB::table('modules_registry')
                            ->where('id', $module->id)
                            ->update($updates);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        // Giữ nguyên dữ liệu hash bảo mật
    }
};
