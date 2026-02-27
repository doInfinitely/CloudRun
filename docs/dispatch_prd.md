# CloudRun Dispatch PRD (MVP → v1)

## Goal
Reliable last‑mile dispatch for age‑restricted deliveries:
- fast driver↔job assignment
- offer/accept semantics w/ TTL + locking
- rolling replans (later batching via OR-Tools VRP)
- audit trail (dossier)

## Non-goals (MVP)
- traffic forecasting
- cross-merchant multi-stop batching
- RL dispatch
- ML acceptance (heuristics only; log training data)

## Components
### Router (road graph)
- route_time(from_node, to_node) -> seconds
- route_path(from_node, to_node) -> polyline nodes
- batch_matrix(node_ids[]) -> time matrix

### Dispatcher
Two loops:
- FAST loop (every ~3s): candidate pruning + min-cost assignment → offers
- BATCH loop (every ~30s): VRP plan on 10–20min horizon → commit next-step offers only

## Objective (per edge d,j)
Let T = eta_pu + wait_pu + eta_drop, L = lateness.
cost = (alpha*T + beta*L + gamma*eta_pu + rho*risk + lambda*fairness + mu*zone) / max(eps, p_accept)

Feasibility filters define candidate edges: eligible + radius + ETA caps + lateness caps.

## Offer/accept protocol
- Dispatcher writes task OFFERED w/ expires_at
- Driver accepts: Redis lock + idempotency → ACCEPTED + dossier events
- Expired offers: revert to UNASSIGNED

## Logging
Per offer: features + outcome (accepted/rejected/timeout) + response latency.


## ETA refinement (v1)
FAST loop uses two-stage pruning:
1) approximate ETA (haversine lower bound / grid)
2) refine top-K with router ETAs + TTL cache


## Offer logging (v1)
Dispatcher writes `offer_logs` rows on each offer with a stable feature payload.
Task accept/reject/expire should update the latest `offer_logs` row outcome for that task:
- ACCEPTED / REJECTED / TIMEOUT
This is the dataset for training `p_accept`.


## Expiry sweeper (v1)
A periodic sweeper marks OFFERED tasks past `offer_expires_at` as `EXPIRED` and sets `offer_logs.outcome = TIMEOUT`.
Run every 10–30 seconds (or 1 minute at low volume) via a scheduler / Cloud Run job.


## DB indexes (v1)
Add indexes to keep dispatch/sweeper queries fast at scale:
- `delivery_tasks(status, offer_expires_at)` (expiry sweeper)
- `offer_logs(task_id, created_at)` (outcome updates)


## Postgres partial index (optional)
If you run Postgres, add a partial index for the expiry hot path:
- `delivery_tasks(offer_expires_at) WHERE status='OFFERED' AND offer_expires_at IS NOT NULL`
This reduces index size and improves sweeper latency.


## Concurrency safety for sweepers
Run at most one sweeper per region. v7 adds a best-effort Postgres advisory lock and `FOR UPDATE SKIP LOCKED` to avoid double-expiration.
