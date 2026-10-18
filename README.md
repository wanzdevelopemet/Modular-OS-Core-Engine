# 🌐 Modular-OS: Enterprise Microkernel & Micro-Frontend Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/badge/Release-v1.0.0--rc-green.svg)](https://github.com/modular-os/core-engine)
[![Docker](https://img.shields.io/badge/Docker-Unified%20Port%2080-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Laravel](<https://img.shields.io/badge/Laravel-11%20Octane%20(RoadRunner)-FF2D20?logo=laravel&logoColor=white>)](core/kernel)
[![React](https://img.shields.io/badge/React-18%20Host%20Shell-61DAFB?logo=react&logoColor=black)](core/frontend-shell)
[![Redis](https://img.shields.io/badge/Redis-7%20Pub%2FSub%20SSE-DC382D?logo=redis&logoColor=white)](https://redis.io)

> **Modular-OS** là dự án engine mở, kết hợp giữa mô hình **Microkernel Pattern**, **Polyglot Micro-Frontend**, triết lý truyền thông liên module **Anti-Mesh**, điều phối sự kiện đa máy khách thời gian thực **Redis Pub/Sub SSE**, và tiêu chuẩn bảo mật danh tính **Zero-Trust (HMAC-SHA256 & CAMS JWT SSO)** vận hành trên nền tảng siêu tốc **Laravel 11 Octane (RoadRunner runtime)**.
>
> 🚀 **Unified Production Serving**: Hệ thống đã được đóng gói hoàn chỉnh để vận hành trên một cổng duy nhất (`http://localhost:80`) kết hợp giữa Nginx, Laravel Octane Microkernel và các bundle tĩnh được tối ưu hóa. **Không còn phụ thuộc vào Vite Dev Server (`npm run dev`) để kiểm thử giao diện!**

---

## 📑 Mục lục

1. [Triết lý kiến trúc cốt lõi (Architectural Philosophy)](#-1-triết-lý-kiến-trúc-cốt-lõi)
2. [Sơ đồ hạ tầng & Định tuyến tập trung (System Topology)](#-2-sơ-đồ-hạ-tầng--định-tuyến-tập-trung)
3. [Cơ chế Phục vụ Hợp nhất (Unified Production Serving - No Dev Server Needed)](#-3-cơ-chế-phục-vụ-hợp-nhất-unified-production-serving)
4. [Hướng dẫn cài đặt 1-Click (1-Click Local Setup Guide)](#-4-hướng-dẫn-cài-đặt-1-click)
5. [CAMS SSO & Tiêu chuẩn bảo mật Zero-Trust HMAC](#-5-cams-sso--tiêu-chuẩn-bảo-mật-zero-trust-hmac)
6. [Hướng dẫn từng bước: Viết Module đầu tiên từ HelloWorld Template](#-6-hướng-dẫn-từng-bước-viết-module-đầu-tiên-từ-helloworld-template)
7. [Cơ chế Chống bẫy định tuyến (Anti-Routing Trap & Delegation Mode)](#-7-cơ-chế-chống-bẫy-định-tuyến-anti-routing-trap)
8. [Cấu trúc cây thư mục Monorepo](#-8-cấu-trúc-cây-thư-mục-monorepo)
9. [Đóng góp & Giấy phép (Contributing & License)](#-9-đóng-góp--giấy-phép)

---

## 🏛️ 1. Triết lý kiến trúc cốt lõi

Modular-OS được xây dựng nhằm giải quyết triệt để 3 vấn nạn muôn thuở của kiến trúc Microservices và Micro-Frontend truyền thống: **Spaghetti Service Mesh**, **Lỗ hổng mạo danh module nội bộ**, và **Sự ràng buộc công nghệ (Vendor Lock-in)**.

```
+--------------------------------------------------------------------------------------------------+
|                                          TRIẾT LÝ CỐT LÕI                                        |
+-----------------------------------+----------------------------------+---------------------------+
| 1. Microkernel (Hạt nhân siêu nhẹ)| 2. Anti-Mesh (Chống đan lưới)    | 3. Zero-Trust Security    |
| - Lõi không chứa bảng nghiệp vụ   | - Tuyệt đối CẤM gọi API chéo     | - Mọi request phải ký     |
|   (không có Orders, Products...). | - Mọi giao tiếp đi qua Redis     |   HMAC-SHA256 với Secret  |
| - Chỉ quản lý Routing, Registry,  |   Pub/Sub Event Bus.             | - Chống Replay Attack     |
|   Extensions, và Event Broker.    | - Module crash độc lập, không    | - Định danh người dùng    |
|                                   |   ảnh hưởng toàn hệ thống.       |   tập trung qua CAMS JWT. |
+-----------------------------------+----------------------------------+---------------------------+
```

### 1.1. Microkernel (Hạt nhân siêu nhẹ với Laravel Octane)

- Lõi Kernel (`core/kernel/` viết bằng Laravel 11 PHP 8.4 chạy trên **Laravel Octane với RoadRunner Runtime**) **chỉ giữ vai trò điều phối hạ tầng**:
  1. **API Gateway & Gatekeeper**: Xác thực chữ ký điện tử HMAC và JWT trước khi chuyển tiếp.
  2. **Module Registry**: Quản lý danh bạ vệ tinh động (`modules_registry`).
  3. **Extension Manager**: Tự động phát hiện và nạp các Tiện ích lõi (`core/extensions/`).
  4. **Event Bus Gateway & Multi-Client SSE Stream**: Cổng nạp sự kiện vào Redis Broker và phân phối luồng Server-Sent Events (`/api/core/events/stream`) đến toàn bộ các máy khách trình duyệt kết nối.

### 1.2. Anti-Mesh (Chống đan lưới & Đồng bộ Đa máy khách thời gian thực)

- **Quy tắc tuyệt đối**: Các module vệ tinh không được phép thực hiện gọi HTTP trực tiếp sang nhau (No Direct Service-to-Service REST Call).
- Mọi tương tác hoặc kích hoạt nghiệp vụ liên module phải đi qua **Redis Event Bus (Pub/Sub)** thông qua SDK `@modular-os/bridge`. Khi `shop-module` bán được gói VIP, nó gửi sự kiện `SHOP_VIP_BOUGHT` lên Gateway; Redis Pub/Sub lập tức phát tán sự kiện đến Server-Sent Events (SSE) Stream để toàn bộ các trình duyệt khác (kể cả User B ở máy tính khác) đều nhận được sự kiện và cập nhật giao diện trong tích tắc mà không cần gọi API chéo.

### 1.3. Zero-Trust Security (Bảo mật không tin tưởng mặc định)

- Mọi gói tin gửi từ Module vào Gateway đều phải qua kiểm định 4 lớp của `GatekeeperMiddleware`:
  1. **Định danh Module**: Kiểm tra header `X-Module-ID` có tồn tại và đang `is_active = true`.
  2. **Chữ ký điện tử HMAC**: So khớp header `X-HMAC-Signature` băm `HMAC-SHA256(payload + timestamp, secret_key)` bằng thuật toán thời gian hằng số `hash_equals`.
  3. **Chống tấn công Replay Attack**: Cửa sổ trôi thời gian `|now - X-Timestamp| <= 300` giây (5 phút).
  4. **Xác thực CAMS JWT**: Nếu module yêu cầu xác thực (`requires_auth = true`), bắt buộc phải có Bearer JWT do CAMS cấp.

---

## 🗺️ 2. Sơ đồ hạ tầng & Định tuyến tập trung

```
                              CLIENT TRÌNH DUYỆT (PORT 80)
                                            |
                                            v
+--------------------------------------------------------------------------------------------------+
|                                    NGINX REVERSE PROXY (:80)                                     |
|  - /api/core/               --> Chuyển tiếp tới Laravel Microkernel (:8000)                      |
|  - /modules/helloworld/     --> Phục vụ trực tiếp Static Bundle của HelloWorld Module            |
|  - /modules/shop/           --> Phục vụ trực tiếp Static Bundle của Shop VIP Module              |
|  - /modules/forum/          --> Phục vụ trực tiếp HTML5/JS của Forum Module                      |
|  - / và SPA routes          --> Phục vụ Giao diện Host Shell React 18 (:80)                      |
+-------------------------------------------+------------------------------------------------------+
                                            |
                 +--------------------------+--------------------------+
                 |                                                     |
                 v (REST /api/core/*)                                  v (Static HTML / JS Assets)
+---------------------------------+                   +----------------------------------+
| LARAVEL 11 MICROKERNEL (:8000)  |                   | HOST SHELL & SATELLITE MODULES   |
| - GatekeeperMiddleware          |                   | - Dual-Home AppRouter            |
|   (HMAC-SHA256 + CAMS JWT)      |                   | - UniversalModuleLoader (Iframe/ |
| - CoreAdminController (CRUD)    |                   |   Federation/Web Component)      |
| - CamsAuthController (/me)      |                   | - DelegatedHomeWrapper (FAB bar) |
+----------------+----------------+                   +----------------------------------+
                 |
                 v (Pub/Sub)
+---------------------------------+
| REDIS BROKER 7 (:6379)          |
| Anti-Mesh Event Bus & Logs      |
+---------------------------------+
```

---

## ⚡ 3. Cơ chế Phục vụ Hợp nhất (Unified Production Serving)

Trước đây, nhà phát triển phải bật nhiều cửa sổ Terminal để chạy song song Vite Dev Server trên nhiều port (`localhost:3000`, `localhost:4001`, `localhost:4002`...).

Trong phiên bản **v1.0.0-rc**:

- **Không còn phụ thuộc vào Vite Dev Server (`npm run dev`)**: Hệ thống biên dịch toàn bộ Host Shell và các Modules thành các static asset bundles tối ưu qua lệnh `npm run build:all`.
- **Phục vụ trên một cổng duy nhất (`localhost:80`)**: Nginx đóng vai trò máy chủ trung tâm:
  - Phục vụ Host Shell tại root `/` với cơ chế SPA fallback `try_files $uri $uri/ /index.html;`.
  - Phục vụ các module tĩnh tại `/modules/helloworld/`, `/modules/shop/`, `/modules/forum/`.
  - Điều hướng các API nghiệp vụ lõi về Laravel tại `/api/core/`.
- Khi kiểm thử hay triển khai, bạn chỉ cần gõ đúng một địa chỉ: `http://localhost`.

---

## 🚀 4. Hướng dẫn cài đặt 1-Click

### Yêu cầu tiên quyết:

- **Docker Desktop** (WSL2 trên Windows, hoặc Docker Engine trên macOS/Linux).
- **Node.js** >= 18.x & **NPM** >= 9.x.

### Bước 1: Khởi động Hạ tầng Docker

```bash
# Khởi chạy chế độ nền (Background / Detached mode - Khuyên dùng)
docker compose up -d

# Hoặc khởi chạy chế độ tiền cảnh (Foreground mode - Xem trực tiếp stdout logs của container)
docker compose up
```

> **Chế độ thực thi**: Chạy `docker compose up -d` cho chế độ nền (background mode) hoặc `docker compose up` cho chế độ tiền cảnh (foreground mode).
> **Lưu ý Cổng MySQL**: Database MySQL được ánh xạ cổng ngoài là `3307:3306` (`localhost:3307`) để tránh xung đột với MySQL cài sẵn trên máy chủ. Kết nối nội bộ giữa các container trong mạng `modular-net` vẫn là `3306`.

### Bước 2: Thiết lập Khóa bảo mật & Migrations Lõi

```bash
# 1. Sinh APP_KEY cho Laravel
docker compose exec laravel-core php artisan key:generate

# 2. Xóa sạch cache cấu hình
docker compose exec laravel-core php artisan config:clear

# 3. Chạy migrations tạo bảng users, modules_registry, extensions
docker compose exec laravel-core php artisan migrate
```

### Bước 3: Biên dịch Toàn diện (Build All Frontends)

Chỉ cần chạy lệnh duy nhất này tại thư mục gốc, hệ sinh thái sẽ tự động biên dịch SDK `@modular-os/bridge`, Host Shell và tất cả các modules vệ tinh:

```bash
# 1. Cài đặt dependencies và liên kết NPM Workspaces
npm install

# 2. Biên dịch toàn bộ mã nguồn sang static assets
npm run build:all
```

Sau khi hoàn tất, mở trình duyệt và truy cập:

- **Cổng Tổng Ứng Dụng (Portal Hub)**: `http://localhost/portal`
- **Giao diện Quản Trị Lõi (Core Admin)**: `http://localhost/core-admin`
- **Module HelloWorld Starter**: `http://localhost/m/helloworld-module`
- **Kiểm tra API Gateway Health**: `http://localhost/api/core/health`

### Tài khoản Super Admin mặc định:

- **Email**: `admin@modular-os.internal`
- **Mật khẩu**: `password123` (hoặc `admin123`)

---

## 🔐 5. CAMS SSO & Tiêu chuẩn bảo mật Zero-Trust HMAC

### 5.1. CAMS SSO (Core Account Management System)

CAMS là tiện ích lõi nằm tại `core/extensions/cams`, cung cấp định danh tập trung cho mọi module vệ tinh:

- **API Đăng nhập**: `POST /api/core/extensions/cams/login` (nhận `{ email, password }`, trả về signed JWT chứa `uuid`, `email`, `displayName`, `globalRole`).
- **API Xác thực Hồ sơ**: `GET /api/core/extensions/cams/me` (nhận Bearer JWT, trả về thông tin user).
- **Lưu trữ & Truy xuất qua SDK**:

  ```javascript
  import { CoreAuth } from "@modular-os/bridge";

  // Kiểm tra thông tin người dùng hiện tại
  const user = CoreAuth.getUser();
  console.log(user?.displayName, user?.globalRole);

  // Kích hoạt Modal đăng nhập tập trung nếu chưa đăng nhập
  if (!user) {
    CoreAuth.requireLogin();
  }
  ```

### 5.2. Chữ ký số HMAC Zero-Trust & Replay Protection

Mọi sự kiện gửi vào `/api/core/event-bus/publish` bắt buộc phải kèm 3 headers:

| Tên Header         | Ví dụ               | Ý nghĩa                                                           |
| :----------------- | :------------------ | :---------------------------------------------------------------- |
| `X-Module-ID`      | `helloworld-module` | Mã định danh module đã đăng ký trong `modules_registry`.          |
| `X-Timestamp`      | `1792311956761`     | Timestamp mili-giây tại thời điểm gửi. Độ trôi $\le 300\text{s}$. |
| `X-HMAC-Signature` | `a3f5b...`          | Mã băm Hex SHA256 của chuỗi payload và timestamp.                 |

#### Công thức tạo chữ ký số:

$$\text{Signature} = \text{HMAC-SHA256}(\text{RawBody} + ":" + \text{Timestamp}, \text{SecretKey})$$

_(Gateway cũng hỗ trợ chuẩn `Timestamp + "." + RawBody` để tương thích linh hoạt đa ngôn ngữ)_.

---

## 🛠️ 6. Hướng dẫn từng bước: Viết Module đầu tiên từ HelloWorld Template

Thư mục `modules/helloworld-module/` là mẫu chuẩn được cấu trúc sẵn để bạn nhân bản và phát triển module mới.

### Bước 1: Khám phá cấu trúc của `helloworld-module`

```
modules/helloworld-module/
├── manifest.json                  # Mô tả module, ngàm UI, remote entry URL, secret key
├── package.json                   # NPM workspace configuration
├── Dockerfile                     # Alpine Nginx container để chạy độc lập (port 4003)
└── frontend/                      # Giao diện React 18 + Vite
    ├── index.html                 # Entrypoint
    ├── vite.config.js             # Cấu hình base: './' phục vụ tĩnh
    └── src/
        ├── main.jsx               # React DOM bootstrap
        └── HelloWorldApp.jsx      # Minh họa CAMS SSO & Event Bus
```

### Bước 2: Đăng ký Module vào Core Admin

1. Mở trình duyệt vào `http://localhost/core-admin`, đăng nhập bằng tài khoản Super Admin.
2. Tại tab **Quản Lý Modules**, nhấn **+ Thêm Module Mới**:
   - **Module ID**: `helloworld-module`
   - **Tên hiển thị**: `Hello World Starter (Template)`
   - **Ngàm giao diện**: `Sandboxed Iframe` (hoặc `Vite Federation`)
   - **Remote Entry URL**: `/modules/helloworld/index.html`
   - **Khóa HMAC Secret Key**: Nhấn **Tự sinh khóa** (ví dụ: `helloworld_super_secret_key_2026`).
3. Nhấn **Xác Nhận Đăng Ký Module**. Hệ thống tự động lưu vào MySQL và thông báo qua Redis Event Bus.
4. Bấm nút **Khóa HMAC** tại danh sách để xem và sao chép mã bí mật vừa tạo.

### Bước 3: Sử dụng `@modular-os/bridge` trong mã nguồn Module

#### 1. Đăng nhập qua CAMS SSO:

```jsx
import { CoreAuth } from "@modular-os/bridge";

function MyComponent() {
  const user = CoreAuth.getUser();

  return user ? (
    <div>
      Xin chào {user.displayName} ({user.globalRole})
    </div>
  ) : (
    <button onClick={() => CoreAuth.requireLogin()}>Đăng nhập</button>
  );
}
```

#### 2. Phát sự kiện lên Event Bus (với Secret Key):

```javascript
import { CoreBridge } from "@modular-os/bridge";

const MODULE_ID = "helloworld-module";
const SECRET_KEY = "helloworld_super_secret_key_2026";

await CoreBridge.emit(
  "HELLOWORLD_PING",
  { message: "Hello from my custom module!", time: Date.now() },
  SECRET_KEY,
  MODULE_ID,
);
```

#### 3. Lắng nghe sự kiện từ các module khác:

```javascript
import { CoreBridge } from "@modular-os/bridge";

const unsubscribe = CoreBridge.on("SHOP_VIP_BOUGHT", (eventData) => {
  console.log("Phát hiện sự kiện VIP từ Shop Module:", eventData);
});

// Hủy lắng nghe khi unmount:
// unsubscribe();
```

### Bước 4: Biên dịch và chạy trên hệ thống

Mỗi khi bạn chỉnh sửa xong module của mình, chạy:

```bash
npm run build:all
```

Mở ngay `http://localhost/m/helloworld-module` trên trình duyệt để trải nghiệm module chạy trực tiếp trên cổng 80 hợp nhất!

---

## 🛡️ 7. Cơ chế Chống bẫy định tuyến & Phân tách Layout Tuyệt đối (Strict Layout Separation)

Khi một module vệ tinh được quản trị viên đặt làm Trang chủ mặc định (`is_default_home = true` - Delegation Mode), giao diện Host Shell áp dụng nguyên tắc **Phân tách Ranh giới Tuyệt đối (Absolute Separation of Concerns)**:

1. **Phân tách Độc lập 2 Layouts:**
   - **`AdminLayout`**: Đóng gói Top Navigation Bar, User Avatar CAMS, Notification Bell, và Footer. Chỉ bọc các tuyến đường bắt đầu bằng `/admin/*`.
   - **`DelegatedModuleLayout`**: Hoàn toàn vô hình, không header, không footer, không có thanh công cụ quản trị. Module vệ tinh được nạp qua `UniversalModuleLoader` với chế độ `fullscreen` chiếm trọn 100% viewport (`100vw x 100vh`). Người dùng cuối trải nghiệm module như một website độc lập bình thường.

2. **Nút Hành Động Nổi Ẩn (Hidden Admin FAB - For SUPER_ADMIN Only):**
   - Nút FAB cố định tại góc dưới bên phải (`#delegated-admin-fab`, `z-index: 999999`).
   - **Điều kiện hiển thị**: Nút này **CHỈ hiển thị khi người dùng hiện tại có vai trò `SUPER_ADMIN`** được xác thực bằng chữ ký số trong JWT Token của CAMS.
   - Khi Super Admin bấm vào FAB, hệ thống lập tức điều hướng 1-click về Bảng Quản Trị Lõi (`/admin` -> `/admin/registry`).
   - Người dùng phổ thông hoặc khách vãng lai hoàn toàn không thấy nút này, bảo đảm sự tách biệt thẩm mỹ và an ninh.

3. **Phân chia Route Quản Trị Độc lập:**
   - **`/admin/hub`**: Cổng Tổng (Hub) hiển thị danh sách các modules vệ tinh đang sẵn sàng dưới dạng thẻ (Portal Grid).
   - **`/admin/registry`**: Khu vực Quản trị Đăng ký Module, Tiện ích Lõi Extensions, Cấu hình Trang chủ và Giám sát Health / Event Bus.
   - Các đường dẫn cũ (`/portal`, `/core-admin`) được tự động chuyển hướng (Redirect 301/SPA) tương thích ngược.

---

## 📂 8. Cấu trúc cây thư mục Monorepo

```
Modular-OS Core Engine/
├── core/
│   ├── kernel/                     # Hạt nhân Microkernel (Laravel 11 / PHP 8.4 Octane RoadRunner)
│   │   ├── app/
│   │   │   ├── Http/Controllers/   # CoreAdminController, EventBusController
│   │   │   ├── Http/Middleware/    # GatekeeperMiddleware (HMAC & Zero-Trust)
│   │   │   ├── Models/             # ModuleRegistry, ExtensionRegistry, User
│   │   │   └── Services/           # EventBusService (Redis Pub/Sub SSE)
│   │   ├── database/migrations/    # Migrations hạt nhân (users, modules_registry, extensions_registry)
│   │   └── routes/api.php          # RESTful Core API Routes & /events/stream
│   ├── frontend-shell/             # Khung vỏ bọc Host Shell (React 18 + Vite)
│   │   ├── dist/                   # Static build bundle phục vụ qua Nginx
│   │   ├── src/
│   │   │   ├── api/apiClient.js    # Client HTTP kết nối /api/core
│   │   │   ├── layouts/            # AdminLayout, DelegatedModuleLayout (Strict Separation)
│   │   │   ├── components/         # UniversalModuleLoader, Header, ErrorBoundary
│   │   │   ├── pages/              # PortalHome (/admin/hub), AdminDashboard (/admin/registry)
│   │   │   └── router/AppRouter.jsx# Dual-Home Anti-Trap Router
│   └── extensions/                 # Tiện ích lõi tự động nạp (Core Extensions)
│       ├── cams/                   # Core Account Management System (JWT SSO Controller)
│       └── notification-center/    # Trung tâm thông báo Realtime
├── packages/
│   └── core-bridge-sdk/            # Thư viện Universal SDK @modular-os/bridge
├── modules/                        # Các module vệ tinh tuân thủ Anti-Mesh
│   ├── helloworld-module/          # Module mẫu chuẩn (Isolated Starter Template)
│   ├── shop-module/                # Module Thương Mại (Vite Federation / React)
│   └── forum-module/               # Module Diễn Đàn (HTML5 Sandboxed Iframe)
├── docker/
│   ├── nginx/nginx.conf            # Nginx Reverse Proxy & Unified Static Web Root
│   └── laravel/Dockerfile          # PHP 8.4 Alpine CLI Container
├── docker-compose.yml              # Khởi chạy toàn bộ hạ tầng với Nginx :80, MySQL :3307, Redis :6379
└── package.json                    # NPM Workspaces với lệnh `build:all` và `dev:all`
```

---

## 🤝 9. Đóng góp & Giấy phép

Modular-OS là dự án nguồn mở phát hành theo giấy phép **[MIT License](LICENSE)**.

Mọi đóng góp từ cộng đồng (Issues, Feature Proposals, Pull Requests) nhằm hoàn thiện kiến trúc Microkernel, Micro-Frontend và bảo mật Zero-Trust đều được nồng nhiệt chào đón!

> **Modular-OS • Built with precision for Enterprise Scalability, Anti-Mesh Resiliency, and Zero-Trust Security.**
