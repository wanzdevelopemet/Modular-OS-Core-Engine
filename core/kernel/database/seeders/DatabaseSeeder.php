<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\ModuleRegistry;
use App\Models\ExtensionRegistry;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. TẠO TÀI KHOẢN SUPER ADMIN KHỞI ĐẦU
        User::updateOrCreate(
            ['email' => 'admin@modular-os.internal'],
            [
                'password' => Hash::make('admin123'),
                'display_name' => 'Hạt Nhân Quản Trị',
                'avatar' => 'https://api.dicebear.com/7.x/bottts/svg?seed=ModularAdmin',
                'global_role' => 'super_admin',
                'status' => 'active',
            ]
        );

        // 2. ĐĂNG KÝ MODULE VÍ DỤ: SHOP-MODULE (React Federation + Node.js Backend)
        ModuleRegistry::updateOrCreate(
            ['module_id' => 'shop-module'],
            [
                'name' => 'Cửa Hàng Trực Tuyến (Shop VIP)',
                'frontend_type' => 'federation',
                'remote_entry_url' => 'http://localhost:4001/assets/remoteEntry.js',
                'secret_key_hash' => 'secret_hash_cua_shop',
                'is_active' => true,
                'is_default_home' => false,
                'requires_auth' => true,
            ]
        );

        // 3. ĐĂNG KÝ MODULE VÍ DỤ: FORUM-MODULE (HTML5 / Pure JS Sandboxed Iframe)
        ModuleRegistry::updateOrCreate(
            ['module_id' => 'forum-module'],
            [
                'name' => 'Diễn Đàn Cộng Đồng (Forum Iframe)',
                'frontend_type' => 'iframe',
                'remote_entry_url' => 'http://localhost:4002/index.html',
                'secret_key_hash' => 'secret_hash_cua_forum',
                'is_active' => true,
                'is_default_home' => false,
                'requires_auth' => false,
            ]
        );

        // 4. ĐĂNG KÝ EXTENSIONS MẶC ĐỊNH
        ExtensionRegistry::updateOrCreate(
            ['identifier' => 'cams'],
            ['name' => 'Core Account Management System', 'is_active' => true]
        );

        ExtensionRegistry::updateOrCreate(
            ['identifier' => 'notification-center'],
            ['name' => 'Notification Center', 'is_active' => true]
        );
    }
}

