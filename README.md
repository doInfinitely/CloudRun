# Vape Marketplace MVP (Texas-first) — FastAPI + Postgres

**Model A:** Merchant is seller of record. Platform handles order-taking + delivery orchestration with hard compliance gates:
- Age verification at **checkout**
- ID verification at **doorstep**
- **No leave-at-door**
- Append-only **Order Dossier** (hash-chained)

## What’s included
- FastAPI API app (`apps/api`)
- Celery worker (`apps/worker`)
- SQLAlchemy 2.0 models + Alembic migrations (`packages/db`)
- Domain + state machines (`packages/core`)
- Dossier event writer with hash chaining (`packages/dossier`)
- Verification orchestrator with a **fake IDV vendor** for local testing (`packages/verification`)
- Dispatch stubs + OR-Tools wrapper placeholder (`packages/dispatch`)
- Pytest “Texas-first” QA scenarios (`tests/qa`)

## Quickstart (local)
### 1) Create venv & install
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Run Postgres (docker)
```bash
docker compose up -d db redis
```

### 3) Run migrations
```bash
alembic upgrade head
```

### 4) Start API
```bash
uvicorn apps.api.main:app --reload --port 8000
```

### 5) Run tests
```bash
pytest -q
```

## Environment variables
Copy `.env.example` → `.env` and adjust as needed.

## Notes
- The included Fake IDV vendor makes it easy to test pass/fail behavior without a real provider.
- Evidence refs are stored as *tokens/pointers* only; no raw ID images are stored by design.


## Extensions added
### Idempotency
Mutating endpoints require `Idempotency-Key` header:
- POST `/v1/orders/{id}/verify_age`
- POST `/v1/orders/{id}/payment/authorize`
- POST `/v1/orders/{id}/doorstep_id_check/submit`
- POST `/v1/orders/{id}/deliver/confirm`
- POST `/v1/tasks/{id}/accept`

Responses are stored in Postgres (`idempotency_keys`) keyed by route + idempotency key.

### Redis offer/accept locking
Task acceptance is protected by a short Redis lock (`SET NX EX`) to prevent double-accepts.

## Integration test runner
Run `make itest` (or `scripts/run_integration.sh`) to spin up Postgres + Redis, run migrations, then pytest.


### Idempotency middleware
`IdempotencyMiddleware` enforces idempotency uniformly for selected POST routes and stores responses in Postgres.
You still should pass `Idempotency-Key` for retries.

### Explicit refusal endpoint
Drivers (or support) can refuse an order via:
- `POST /v1/orders/{order_id}/refuse`

This records `REFUSED` + creates a real `delivery_tasks` return task and emits `RETURN_INITIATED`.


## Dispatcher (CloudRun)
- Spec: `docs/dispatch_prd.md`
- FAST matching loop reference: `packages/dispatch/`

Run stub:
```bash
python apps/dispatcher/run_tick.py
```


### Internal dispatch tick
Run the dispatcher loop server-side via:
- `POST /internal/dispatch/tick?region_id=tx-dfw`
Optionally protect with `INTERNAL_API_TOKEN` and header `X-Internal-Token`.

Example:
```bash
curl -X POST "http://localhost:8000/internal/dispatch/tick?region_id=tx-dfw" \
  -H "X-Internal-Token: $INTERNAL_API_TOKEN"
```


### OfferLog training data
FAST loop now writes `offer_logs` rows on every offer. Outcomes are updated on accept/reject/timeout (best-effort).
Use this table to train `p_accept` once you have volume.


### Offer expiry sweeper
Run periodically (Cloud Run job / cron) to mark expired offers:
- `POST /internal/dispatch/expire_offers`

Example:
```bash
curl -X POST "http://localhost:8000/internal/dispatch/expire_offers?limit=500" \
  -H "X-Internal-Token: $INTERNAL_API_TOKEN"
```

Local CLI:
```bash
python apps/dispatcher/expire_offers.py
```


### Performance: DB indexes
Migration `0003_add_dispatch_indexes` adds:
- `ix_delivery_tasks_status_offer_expires_at` for the expiry sweeper query
- `ix_offer_logs_task_id_created_at` for outcome updates


### Performance: Postgres partial index (optional)
Migration `0004_add_partial_index_postgres` adds a Postgres-only partial index:
- `ix_delivery_tasks_offered_expires_at_partial` on `delivery_tasks(offer_expires_at) WHERE status='OFFERED'`
