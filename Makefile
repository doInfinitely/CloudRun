install:
	python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

db:
	docker compose up -d db redis

migrate:
	alembic upgrade head

api:
	uvicorn apps.api.main:app --reload --port 8000

test:
	pytest -q

itest:
	./scripts/run_integration.sh
