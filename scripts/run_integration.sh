#!/usr/bin/env bash
set -euo pipefail

docker compose up -d db redis
export DATABASE_URL=${DATABASE_URL:-postgresql+psycopg://postgres:postgres@localhost:5432/vape_mvp}
export REDIS_URL=${REDIS_URL:-redis://localhost:6379/0}

alembic upgrade head
RUN_INTEGRATION=1 pytest -q tests/integration
echo "Integration tests passed."
