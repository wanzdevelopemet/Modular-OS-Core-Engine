# Modular-OS Release Notes: v1.0.0-rc

Welcome to **Modular-OS v1.0.0-rc (Release Candidate)** — the enterprise-grade, open-source Microkernel & Micro-Frontend operating platform engineered for Zero-Trust and Anti-Mesh architectures.

This release marks the transition from architectural proof-of-concept to a hardened, production-ready framework capable of running high-performance polyglot modules with strict security boundaries and instantaneous realtime event streaming.

---

## 🏛️ The 4 Architectural Pillars of v1.0.0-rc

### 1. Microkernel & Zero-Trust Architecture
* **Pure Empty-Kernel Philosophy**: The Core Kernel contains zero application business logic. It strictly acts as a high-throughput API Gateway, Event Broker, and Extension Coordinator.
* **CAMS (Centralized Access & Module Security) SSO**:
  * Unified single sign-on engine issuing signed, role-bound JWTs (`uuid`, `role`, `iat`, `exp`).
  * Strict database access boundary: individual modules are prohibited from querying the `users` table directly; identity and authentication must be resolved via the CAMS bridge.
  * Super Admin bootstrap guard controlled via strict environment checks (`CAMS_SUPERADMIN_ENABLED`, `CAMS_SUPERADMIN_PASSWORD`).
* **Gatekeeper HMAC Signature Verification**:
  * All internal inter-module HTTP communications and Event Bus payloads routed through the Gateway are authenticated with cryptographic HMAC SHA-256 signatures (`X-Module-ID`, `X-Timestamp`, `X-Signature`).
  * Includes replay attack protection (rejecting requests with timestamp skew $> 300$ seconds) and a secure hash fallback mechanism (`secret_key_hash` / `secret_key`).

### 2. Anti-Mesh Event Bus with Realtime SSE
* **Star-Topology Event Coordination**: Eliminates tight point-to-point service meshes by routing all cross-module interactions through the centralized Core Event Bus.
* **Redis Pub/Sub Realtime Pipeline**: Payloads published by backend services or authenticated frontend modules are dispatched to the Redis `modular_os_events` channel.
* **Multi-Client Server-Sent Events (SSE)**:
  * Exposes `GET /api/events/stream` with real-time SSE streaming.
  * Nginx reverse proxy configured with `proxy_buffering off;` and `proxy_read_timeout 24h;` for zero-latency event transmission across browsers.
  * `@modular-os/bridge` SDK automatically maintains the SSE stream connection and dispatches standard DOM events to loaded micro-frontends.

### 3. Dual-Layout UI Shell & Strict Separation
* **Strict Layout Separation**:
  * `AdminLayout.jsx`: Exclusively mounts administrative routes (`/admin`, `/admin/hub`, `/admin/registry`, `/admin/security`, `/admin/events`). Displays management headers, user credentials, and navigation controls.
  * `DelegatedModuleLayout.jsx`: A completely invisible 100% viewport shell for the default homepage (`/`). When a module is designated as `is_default_home=true`, regular end-users see zero core administrative UI, headers, or internal tools.
* **Hidden "Back to Core" FAB**:
  * A floating administrative entrypoint rendered exclusively for authenticated users bearing the `SUPER_ADMIN` role.
  * Invisibly hidden for end-users, guests, and standard tenants.
* **Universal Module Loader & Auto Kill-Switch**:
  * Supports Module Federation, Web Components, and Sandboxed Iframes.
  * React `ErrorBoundary` features an automated Kill-Switch that traps cascading frontend failures and temporarily isolates crashing modules.

### 4. Developer Experience & Production Infrastructure
* **High-Performance Laravel 11 Octane**:
  * Integrated with the **RoadRunner 2025** enterprise runtime server, serving API traffic concurrently on port 8000.
* **HelloWorld Starter Template (`helloworld-module`)**:
  * Complete reference micro-module demonstrating Vite Module Federation, `@modular-os/bridge` integration, HMAC payload signing, and event subscription.
* **1-Click Docker Compose Setup**:
  * Fully orchestrated stack: Nginx Gateway (Port 80), Laravel Octane (Port 8000), MySQL 8 (Port 3307), Redis 7 (Port 6379), and polyglot module containers.
* **Comprehensive Test Coverage**:
  * PHPUnit Feature test suite (15 tests, 54 assertions) covering Gatekeeper HMAC validation, replay defense, CAMS JWT generation, SuperAdmin guards, and Module Registry management.

---

## 📦 What's Included

| Component | Path | Description |
| :--- | :--- | :--- |
| **Core Kernel** | `core/kernel/` | Laravel 11 Octane + RoadRunner Gateway & Event Bus |
| **Core UI Shell** | `core/frontend-shell/` | React 18 + Vite Micro-Frontend Host & Dual Layouts |
| **CAMS Extension** | `core/extensions/cams/` | Zero-Trust Auth & SSO Controller |
| **Notification Center**| `core/extensions/notification-center/` | System-wide Broadcast & Bell UI Hook |
| **Bridge SDK** | `packages/core-bridge-sdk/` | TypeScript SDK with HMAC Crypto, Auth & SSE Client |
| **HelloWorld Module**| `modules/helloworld-module/` | Reference Micro-Frontend & Microservice |
| **Shop Module** | `modules/shop-module/` | Sample E-Commerce Module with Event Dispatch |
| **Forum Module** | `modules/forum-module/` | Legacy / Static Iframe Integration Pattern |
| **Gateway Proxy** | `docker/nginx/nginx.conf` | Optimized Reverse Proxy with SSE & Static Caching |

---

## 🚀 Quickstart Guide

### Option 1: 1-Click Docker Setup (Recommended)
```bash
# 1. Clone repository
git clone https://github.com/your-org/modular-os.git
cd modular-os

# 2. Setup environment
cp core/kernel/.env.example core/kernel/.env

# 3. Spin up the entire infrastructure
docker compose up -d

# 4. Open in browser
# - Public Portal / Delegated Home: http://localhost
# - Core Management Hub:            http://localhost/admin
```

### Option 2: Monorepo Production Build
```bash
# Install dependencies
npm install

# Build Bridge SDK, UI Shell, and all micro-frontends
npm run build:all

# Run backend feature tests
docker compose exec laravel-core vendor/bin/phpunit --testdox
```

---

## 🔒 Security & Environment Checklist

Before deploying to public infrastructure:
- [x] `APP_ENV=production` and `APP_DEBUG=false` in `.env`.
- [x] Unique `APP_KEY` generated via `php artisan key:generate`.
- [x] Secure `JWT_SECRET` generated for CAMS.
- [x] `CAMS_SUPERADMIN_ENABLED=false` after initial administrative provisioning.
- [x] `CORS_ALLOWED_ORIGINS` configured to your production domain(s).
- [x] Sensitive files (`.env`, `storage/logs/*`, `vendor/`, `node_modules/`) omitted via `.gitignore`.

---

## 📄 License
Modular-OS is open-source software licensed under the [MIT License](LICENSE).
