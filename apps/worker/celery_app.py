import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery = Celery("vape_mvp", broker=REDIS_URL, backend=REDIS_URL)

@celery.task
def ping():
    return "pong"
