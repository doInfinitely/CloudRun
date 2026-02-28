install:
	python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

db:
	docker compose up -d db redis

migrate:
	alembic upgrade head

api:
	uvicorn apps.api.main:app --reload --port 8000

worker:
	celery -A apps.worker.celery_app worker --beat --loglevel=info

merchant:
	cd apps/merchant-app && npm run dev

customer:
	cd apps/customer-app && npm run dev

driver:
	cd apps/driver-app && npm run dev

mission:
	cd apps/mission-control && npm run dev

test:
	python -m pytest tests/unit/ -v

itest:
	./scripts/run_integration.sh

seed:
	python scripts/seed_customer_demo.py

docker-up:
	docker compose -f docker-compose.prod.yml up --build -d

docker-down:
	docker compose -f docker-compose.prod.yml down
