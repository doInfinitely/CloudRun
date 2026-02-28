# CloudRun — Age-Restricted Marketplace with Last-Mile Dispatch

**Model A marketplace** for age-restricted products (vape) with compliance-first architecture and real-time dispatch orchestration. Texas-first deployment.

## Architecture

```
apps/
  api/          FastAPI backend (50+ endpoints)
  worker/       Celery beat + worker (dispatch tick, offer expiry, batch loop)
  customer-app/ React storefront (Vite, port 5173)
  merchant-app/ React merchant dashboard (Vite, port 5174)
  driver-app/   React driver app with 3D map (Vite, port 5175)
  mission-control/ React admin dashboard (Vite, port 5177)
  dispatcher/   Standalone dispatch tick runner

packages/
  core/         Enums, state machine, domain errors
  db/           SQLAlchemy 2.0 models (17 tables), session config
  dispatch/     FAST + BATCH matching loops, MCF solver, offer management
  dossier/      Hash-chained order event audit trail
  verification/ Age/ID verification (fake + Onfido)
  payments/     Payment processing (fake + Stripe)
  router/       Travel time routing (haversine + OSRM)
  geo/          H3 geospatial indexing
  predictions/  Driver acceptance probability heuristic
  notifications/ Push/SMS notification dispatcher (console + Twilio)
  common/       Crypto, Redis, idempotency utilities

tests/
  unit/         48 unit tests (dispatch, state machine, router, payments, verification)
  integration/  End-to-end order flow tests
  qa/           Texas compliance scenarios
```

## Compliance Gates
- Age verification at **checkout** (fake vendor or Onfido)
- ID verification at **doorstep** (driver-submitted)
- **No leave-at-door** — delivery requires confirmation
- Append-only **Order Dossier** with SHA-256 hash chaining
- Idempotent state transitions with DB replay

## Quickstart

### 1. Install
```bash
make install
# or: python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
cp .env.example .env
```

### 2. Start services
```bash
make db          # Postgres + Redis via Docker
make migrate     # Run Alembic migrations
make seed        # Seed demo data (merchant, stores, products, customer)
```

### 3. Run
```bash
make api         # API on :8000 (Swagger at /docs, ReDoc at /redoc)
make worker      # Celery beat + worker (dispatch every 3s, expiry every 15s, batch every 30s)
make merchant    # Merchant dashboard on :5174
make customer    # Customer storefront on :5173
make driver      # Driver app on :5175
make mission     # Admin dashboard on :5177
```

### 4. Test
```bash
make test        # 48 unit tests
make itest       # Integration tests (requires running Postgres + Redis)
```

## API Documentation

Start the API and visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

| Category | Endpoint | Description |
|----------|----------|-------------|
| Customer | `POST /v1/orders` | Create order |
| Customer | `POST /v1/orders/{id}/verify_age` | Age verification gate |
| Customer | `POST /v1/orders/{id}/payment/authorize` | Payment authorization |
| Driver | `GET /v1/drivers/{id}/task` | Poll for offered task |
| Driver | `POST /v1/tasks/{id}/accept` | Accept task offer |
| Driver | `POST /v1/orders/{id}/doorstep_id_check/submit` | Doorstep ID check |
| Driver | `POST /v1/orders/{id}/deliver/confirm` | Confirm delivery |
| Merchant | `GET /v1/merchants/{id}/dashboard` | Dashboard metrics |
| Merchant | `POST /v1/merchants/{id}/stores/{sid}/orders/{oid}/action` | Accept/reject order |
| Admin | `GET /v1/admin/dashboard` | Platform-wide metrics |
| Admin | `POST /v1/admin/merchants/{id}/review` | Approve/reject merchant |
| Admin | `GET /v1/admin/analytics/orders` | Order analytics |
| Internal | `POST /internal/dispatch/tick` | Manual dispatch trigger |

## Dispatch System

Two-loop architecture (see `docs/dispatch_prd.md`):

- **FAST loop** (every 3s): Candidate pruning + min-cost flow matching + offer creation
- **BATCH loop** (every 30s): VRP-style geographic clustering + multi-stop route planning

**Objective function**: `cost = (alpha*T + beta*L + gamma*eta + rho*risk + lambda*fairness + mu*zone) / p_accept`

**Offer protocol**: OFFERED (with TTL) -> ACCEPTED (Redis lock + idempotency) -> PICKUP -> DELIVERED

## Environment Variables

See `.env.example` for all options. Key toggles:

| Variable | Values | Default |
|----------|--------|---------|
| `IDV_VENDOR` | `fake`, `onfido` | `fake` |
| `PAYMENT_PROCESSOR` | `fake`, `stripe` | `fake` |
| `ROUTER_MODE` | `HAVERSINE`, `OSRM` | `HAVERSINE` |
| `AUTH_ENABLED` | `0`, `1` | `0` |
| `RATE_LIMIT_ENABLED` | `0`, `1` | `0` |
| `NOTIFICATION_PROVIDER` | `console`, `twilio` | `console` |

## Docker Deployment

```bash
# Full stack (API + Worker + Postgres + Redis)
make docker-up

# Tear down
make docker-down
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):
1. Unit tests (no DB required)
2. Run migrations against test Postgres
3. Integration tests with Postgres + Redis services

## Database

17 tables across 7 migrations:
- `merchants`, `stores`, `products` — catalog
- `customers`, `customer_addresses`, `customer_age_verifications` — customer data
- `orders`, `order_events` — order state + hash-chained audit trail
- `delivery_tasks`, `offer_logs` — dispatch + ML training data
- `drivers`, `driver_vehicles`, `driver_documents` — driver compliance
- `admin_users`, `support_tickets`, `ticket_messages` — admin/support
- `idempotency_keys` — request replay store
