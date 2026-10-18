# 🌐 Modular-OS: Enterprise Microkernel & Micro-Frontend Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/badge/Release-v1.0.0--rc-green.svg)](https://github.com/modular-os/core-engine)
[![Docker](https://img.shields.io/badge/Docker-Unified%20Port%2080-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Laravel](<https://img.shields.io/badge/Laravel-11%20Octane%20(RoadRunner)-FF2D20?logo=laravel&logoColor=white>)](core/kernel)
[![React](https://img.shields.io/badge/React-18%20Host%20Shell-61DAFB?logo=react&logoColor=black)](core/frontend-shell)
[![Redis](https://img.shields.io/badge/Redis-7%20Pub%2FSub%20SSE-DC382D?logo=redis&logoColor=white)](https://redis.io)

> **Modular-OS** is an open-source engine combining the **Microkernel Pattern**, **Polyglot Micro-Frontend**, an **Anti-Mesh** cross-module communication philosophy, real-time multi-client event dispatching via **Redis Pub/Sub SSE**, and **Zero-Trust (HMAC-SHA256 & CAMS JWT SSO)** identity security standards running on the ultra-fast **Laravel 11 Octane (RoadRunner runtime)** platform.
>
> 🚀 **Unified Production Serving**: The entire system is packaged to run on a single port (`http://localhost:80`), combining Nginx, the Laravel Octane Microkernel, and optimized static bundles. **No longer dependent on the Vite Dev Server (`npm run dev`) for frontend testing!**

---

## 📑 Table of Contents

1. [Core Architectural Philosophy](#-1-core-architectural-philosophy)
2. [System Topology & Centralized Routing](#-2-system-topology--centralized-routing)
3. [Unified Production Serving (No Dev Server Needed)](#-3-unified-production-serving)
4. [1-Click Local Setup Guide](#-4-1-click-local-setup-guide)
5. [CAMS SSO & Zero-Trust HMAC Security Standard](#-5-cams-sso--zero-trust-hmac-security-standard)
6. [Step-by-Step Guide: Writing Your First Module from the HelloWorld Template](#-6-step-by-step-guide-writing-your-first-module-from-the-helloworld-template)
7. [Anti-Routing Trap Mechanism & Strict Layout Separation](#-7-anti-routing-trap-mechanism--strict-layout-separation)
8. [Monorepo Directory Structure](#-8-monorepo-directory-structure)
9. [Contributing & License](#-9-contributing--license)

---

## 🏛️ 1. Core Architectural Philosophy

Modular-OS is designed to completely resolve the three perennial pain points of traditional Microservices and Micro-Frontend architectures: **Spaghetti Service Mesh**, **Internal Module Impersonation Vulnerabilities**, and **Vendor Lock-in**.

```
+--------------------------------------------------------------------------------------------------+
|                                    CORE ARCHITECTURAL PHILOSOPHY                                 |
+-----------------------------------+----------------------------------+---------------------------+
| 1. Microkernel (Ultra-lean Core)  | 2. Anti-Mesh                     | 3. Zero-Trust Security    |
| - Core contains no business       | - Direct cross-API calls are     | - Every request must be   |
|   tables (No Orders, Products...).|   strictly PROHIBITED.           |   signed with HMAC-SHA256 |
| - Only manages Routing, Registry, | - All communication routes via   |   and a Secret Key.       |
|   Extensions, and Event Broker.   |   the Redis Pub/Sub Event Bus.   | - Replay Attack defense.  |
|                                   | - Modules crash independently    | - Centralized user        |
|                                   |   without affecting the system.  |   identity via CAMS JWT.  |
+-----------------------------------+----------------------------------+---------------------------+
```

### 1.1. Microkernel (Ultra-lean Core with Laravel Octane)

- The core kernel (`core/kernel/`, written in Laravel 11 / PHP 8.4 running on **Laravel Octane with RoadRunner Runtime**) **exclusively handles infrastructure orchestration**:
  1. **API Gateway & Gatekeeper**: Authenticates HMAC digital signatures and JWT tokens prior to proxying.
  2. **Module Registry**: Dynamically manages the satellite module registry (`modules_registry`).
  3. **Extension Manager**: Automatically discovers and loads core extensions (`core/extensions/`).
  4. **Event Bus Gateway & Multi-Client SSE Stream**: Ingests events into the Redis Broker and fans out the Server-Sent Events stream (`/api/core/events/stream`) to all connected client browsers.

### 1.2. Anti-Mesh (Real-Time Multi-Client Synchronization)

- **Absolute Rule**: Satellite modules are strictly prohibited from making direct HTTP calls to one another (No Direct Service-to-Service REST Calls).
- All cross-module interactions and business triggers must pass through the **Redis Event Bus (Pub/Sub)** via the `@modular-os/bridge` SDK. For example, when `shop-module` completes a VIP package purchase, it dispatches a `SHOP_VIP_BOUGHT` event to the Gateway; Redis Pub/Sub instantly broadcasts this event to the Server-Sent Events (SSE) Stream so all connected client browsers (including User B on another machine) receive the event and update their UI instantaneously without cross-API calls.

### 1.3. Zero-Trust Security (Default Deny / Zero-Trust)

- Every payload sent from a Module to the Gateway must clear 4 layers of validation in `GatekeeperMiddleware`:
  1. **Module Identification**: Verifies that the `X-Module-ID` header exists and is set to `is_active = true`.
  2. **HMAC Digital Signature**: Validates the `X-HMAC-Signature` header matching the hash `HMAC-SHA256(payload + timestamp, secret_key)` using constant-time string comparison (`hash_equals`).
  3. **Replay Attack Mitigation**: Enforces a time-drift window of $|now - \text{X-Timestamp}| \le 300\text{ seconds}$ (5 minutes).
  4. **CAMS JWT Authentication**: If a module requires authentication (`requires_auth = true`), a valid Bearer JWT issued by CAMS is required.

---

## 🗺️ 2. System Topology & Centralized Routing

```
                               CLIENT BROWSER (PORT 80)
                                            |
                                            v
+--------------------------------------------------------------------------------------------------+
|                                    NGINX REVERSE PROXY (:80)                                     |
|  - /api/core/               --> Proxies to Laravel Microkernel (:8000)                           |
|  - /modules/helloworld/     --> Directly serves the static bundle of HelloWorld Module           |
|  - /modules/shop/           --> Directly serves the static bundle of Shop VIP Module             |
|  - /modules/forum/          --> Directly serves the static HTML5/JS of Forum Module              |
|  - / and SPA routes         --> Serves React 18 Host Shell (:80)                                 |
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

## ⚡ 3. Unified Production Serving

Previously, developers had to run multiple terminal windows concurrently to manage separate Vite Dev Servers across multiple ports (`localhost:3000`, `localhost:4001`, `localhost:4002`, etc.).

In version **v1.0.0-rc**:

- **No longer dependent on Vite Dev Server (`npm run dev`)**: The system builds the Host Shell and all satellite modules into optimized static asset bundles using `npm run build:all`.
- **Served on a single unified port (`localhost:80`)**: Nginx functions as the centralized web server:
  - Serves the Host Shell at the root `/` with SPA fallback mechanism `try_files $uri $uri/ /index.html;`.
  - Serves static modules at `/modules/helloworld/`, `/modules/shop/`, and `/modules/forum/`.
  - Routes core business APIs to Laravel under `/api/core/`.
- For testing and deployment, access the entire platform via a single address: `http://localhost`.

---

## 🚀 4. 1-Click Local Setup Guide

### Prerequisites:

- **Docker Desktop** (WSL2 on Windows, or Docker Engine on macOS/Linux).
- **Node.js** $\ge 18\text{.x}$ & **NPM** $\ge 9\text{.x}$.

### Step 1: Start the Docker Infrastructure

```bash
# Run in background (Detached mode - Recommended)
docker compose up -d

# Or run in foreground (View container stdout logs directly)
docker compose up
```

> **Execution Modes**: Run `docker compose up -d` for background mode or `docker compose up` for foreground mode.
> **MySQL Port Note**: MySQL maps to the host on port `3307:3306` (`localhost:3307`) to avoid collisions with local MySQL instances. Internal container networking within `modular-net` continues to use standard port `3306`.

### Step 2: Configure Security Keys & Run Core Migrations

```bash
# 1. Generate Laravel APP_KEY
docker compose exec laravel-core php artisan key:generate

# 2. Clear configuration cache
docker compose exec laravel-core php artisan config:clear

# 3. Run database migrations to scaffold users, modules_registry, and extensions
docker compose exec laravel-core php artisan migrate
```

### Step 3: Build All Frontends

Execute this single command at the root directory to automatically build the `@modular-os/bridge` SDK, the Host Shell, and all satellite modules:

```bash
# 1. Install dependencies and link NPM Workspaces
npm install

# 2. Compile all source code into static assets
npm run build:all
```

Once completed, open your browser and access:

- **Application Portal Hub**: `http://localhost/portal`
- **Core Admin Dashboard**: `http://localhost/core-admin`
- **HelloWorld Starter Module**: `http://localhost/m/helloworld-module`
- **API Gateway Health Check**: `http://localhost/api/core/health`

### Default Super Admin Credentials:

- **Email**: `admin@modular-os.internal`
- **Password**: `password123` (or `admin123`)

---

## 🔐 5. CAMS SSO & Zero-Trust HMAC Security Standard

### 5.1. CAMS SSO (Core Account Management System)

CAMS is a core extension located at `core/extensions/cams`, providing centralized identity management for all satellite modules:

- **Login API**: `POST /api/core/extensions/cams/login` (accepts `{ email, password }`, returns a signed JWT containing `uuid`, `email`, `displayName`, and `globalRole`).
- **Profile Authentication API**: `GET /api/core/extensions/cams/me` (accepts Bearer JWT, returns user profile data).
- **Storage & Retrieval via SDK**:

  ```javascript
  import { CoreAuth } from "@modular-os/bridge";

  // Retrieve current authenticated user
  const user = CoreAuth.getUser();
  console.log(user?.displayName, user?.globalRole);

  // Trigger centralized login modal if not authenticated
  if (!user) {
    CoreAuth.requireLogin();
  }
  ```

### 5.2. HMAC Zero-Trust Signatures & Replay Protection

Every event dispatched to `/api/core/event-bus/publish` must include 3 headers:

| Header Name        | Example             | Description                                                                     |
| :----------------- | :------------------ | :------------------------------------------------------------------------------ |
| `X-Module-ID`      | `helloworld-module` | Registered module identifier declared in `modules_registry`.                    |
| `X-Timestamp`      | `1792311956761`     | Millisecond Unix timestamp at dispatch. Permissible drift $\le 300\text{s}$.    |
| `X-HMAC-Signature` | `a3f5b...`          | SHA256 hex digest of the payload and timestamp.                                 |

#### Signature Generation Formula:

$$\text{Signature} = \text{HMAC-SHA256}(\text{RawBody} + ":" + \text{Timestamp}, \text{SecretKey})$$

*(The Gateway also supports the `Timestamp + "." + RawBody` format for flexible cross-language compatibility).*

---

## 🛠️ 6. Step-by-Step Guide: Writing Your First Module from the HelloWorld Template

The `modules/helloworld-module/` directory serves as the standardized boilerplate template for cloning and developing new modules.

### Step 1: Explore the `helloworld-module` Structure

```
modules/helloworld-module/
├── manifest.json                  # Module metadata, UI adapter, remote entry URL, secret key
├── package.json                   # NPM workspace configuration
├── Dockerfile                     # Alpine Nginx container for standalone serving (port 4003)
└── frontend/                      # React 18 + Vite frontend
    ├── index.html                 # Entrypoint
    ├── vite.config.js             # Base configuration: './' for static serving
    └── src/
        ├── main.jsx               # React DOM bootstrap
        └── HelloWorldApp.jsx      # Demonstrates CAMS SSO & Event Bus integration
```

### Step 2: Register the Module in Core Admin

1. Open `http://localhost/core-admin` and sign in with the Super Admin credentials.
2. Under the **Module Management** tab, click **+ Add New Module**:
   - **Module ID**: `helloworld-module`
   - **Display Name**: `Hello World Starter (Template)`
   - **UI Mount Strategy**: `Sandboxed Iframe` (or `Vite Federation`)
   - **Remote Entry URL**: `/modules/helloworld/index.html`
   - **HMAC Secret Key**: Click **Generate Key** (e.g., `helloworld_super_secret_key_2026`).
3. Click **Confirm Registration**. The module will be persisted to MySQL and broadcast across the Redis Event Bus.
4. Click the **HMAC Key** button in the module list to view and copy the generated secret key.

### Step 3: Using `@modular-os/bridge` in Module Code

#### 1. Authenticate via CAMS SSO:

```jsx
import { CoreAuth } from "@modular-os/bridge";

function MyComponent() {
  const user = CoreAuth.getUser();

  return user ? (
    <div>
      Welcome, {user.displayName} ({user.globalRole})
    </div>
  ) : (
    <button onClick={() => CoreAuth.requireLogin()}>Sign In</button>
  );
}
```

#### 2. Dispatch an Event to the Event Bus (with Secret Key):

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

#### 3. Subscribe to Events from Other Modules:

```javascript
import { CoreBridge } from "@modular-os/bridge";

const unsubscribe = CoreBridge.on("SHOP_VIP_BOUGHT", (eventData) => {
  console.log("VIP Purchase event detected from Shop Module:", eventData);
});

// Unsubscribe on component unmount:
// unsubscribe();
```

### Step 4: Build and Run

After making changes to your module, run:

```bash
npm run build:all
```

Navigate to `http://localhost/m/helloworld-module` in your browser to test your module running directly on the unified port 80!

---

## 🛡️ 7. Anti-Routing Trap Mechanism & Strict Layout Separation

When a satellite module is designated as the default homepage by an administrator (`is_default_home = true` - Delegation Mode), the Host Shell enforces **Absolute Separation of Concerns**:

1. **Two Completely Isolated Layouts:**
   - **`AdminLayout`**: Encapsulates the Top Navigation Bar, CAMS User Avatar, Notification Bell, and Footer. Exclusively wraps routes prefixed with `/admin/*`.
   - **`DelegatedModuleLayout`**: Completely invisible, containing no headers, footers, or administration bars. The satellite module is mounted via `UniversalModuleLoader` in `fullscreen` mode occupying 100% of the viewport (`100vw x 100vh`). End-users interact with the module as a completely standalone application.

2. **Hidden Admin FAB (For SUPER_ADMIN Only):**
   - A floating action button (FAB) anchored to the bottom-right corner (`#delegated-admin-fab`, `z-index: 999999`).
   - **Visibility Constraint**: This button is **rendered ONLY when the active user holds the `SUPER_ADMIN` role**, verified cryptographically via the CAMS JWT token.
   - When clicked by a Super Admin, the system provides 1-click navigation back to the Core Admin Dashboard (`/admin` -> `/admin/registry`).
   - Standard users and anonymous guests cannot see or inspect this trigger, preserving clean presentation and administrative security.

3. **Isolated Admin Route Segregation:**
   - **`/admin/hub`**: Central Portal Hub displaying accessible satellite modules in a card grid view.
   - **`/admin/registry`**: Administration panel for Module Registry, Core Extensions, Homepage Delegation, and Health / Event Bus Monitoring.
   - Legacy routes (`/portal`, `/core-admin`) are automatically redirected (via 301/SPA redirects) for backwards compatibility.

---

## 📂 8. Monorepo Directory Structure

```
Modular-OS Core Engine/
├── core/
│   ├── kernel/                     # Microkernel core (Laravel 11 / PHP 8.4 Octane RoadRunner)
│   │   ├── app/
│   │   │   ├── Http/Controllers/   # CoreAdminController, EventBusController
│   │   │   ├── Http/Middleware/    # GatekeeperMiddleware (HMAC & Zero-Trust)
│   │   │   ├── Models/             # ModuleRegistry, ExtensionRegistry, User
│   │   │   └── Services/           # EventBusService (Redis Pub/Sub SSE)
│   │   ├── database/migrations/    # Core database migrations (users, modules_registry, extensions_registry)
│   │   └── routes/api.php          # RESTful Core API Routes & /events/stream
│   ├── frontend-shell/             # Host Shell container (React 18 + Vite)
│   │   ├── dist/                   # Static build bundle served via Nginx
│   │   ├── src/
│   │   │   ├── api/apiClient.js    # HTTP client configured for /api/core
│   │   │   ├── layouts/            # AdminLayout, DelegatedModuleLayout (Strict Separation)
│   │   │   ├── components/         # UniversalModuleLoader, Header, ErrorBoundary
│   │   │   ├── pages/              # PortalHome (/admin/hub), AdminDashboard (/admin/registry)
│   │   │   └── router/AppRouter.jsx# Dual-Home Anti-Trap Router
│   └── extensions/                 # Auto-loaded Core Extensions
│       ├── cams/                   # Core Account Management System (JWT SSO Controller)
│       └── notification-center/    # Realtime notification center
├── packages/
│   └── core-bridge-sdk/            # Universal SDK library @modular-os/bridge
├── modules/                        # Anti-Mesh compliant satellite modules
│   ├── helloworld-module/          # Isolated starter template module
│   ├── shop-module/                # E-commerce module (Vite Federation / React)
│   └── forum-module/               # Forum module (HTML5 Sandboxed Iframe)
├── docker/
│   ├── nginx/nginx.conf            # Nginx Reverse Proxy & Unified Static Web Root
│   └── laravel/Dockerfile          # PHP 8.4 Alpine CLI Container
├── docker-compose.yml              # Orchestrates full stack: Nginx :80, MySQL :3307, Redis :6379
└── package.json                    # NPM Workspaces configuration with `build:all` and `dev:all` scripts
```

---

## 🤝 9. Contributing & License

Modular-OS is open-source software licensed under the **[MIT License](LICENSE)**.

Community contributions (Issues, Feature Proposals, Pull Requests) aimed at enhancing the microkernel, micro-frontend architecture, and Zero-Trust security layers are warmly welcomed!

> **Modular-OS • Built with precision for Enterprise Scalability, Anti-Mesh Resiliency, and Zero-Trust Security.**
