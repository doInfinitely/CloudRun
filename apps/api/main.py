import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apps.api.middleware.idempotency import IdempotencyMiddleware
from apps.api.routers import health, orders, dossier, tasks, drivers, internal_expire
from apps.api.routers import profile, vehicles

app = FastAPI(title="Vape Marketplace MVP API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(IdempotencyMiddleware)

app.include_router(health.router, prefix="/v1")
app.include_router(orders.router, prefix="/v1")
app.include_router(dossier.router, prefix="/v1")
app.include_router(tasks.router, prefix="/v1")
app.include_router(drivers.router)
app.include_router(profile.router)
app.include_router(vehicles.router)

# Serve uploaded files
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
