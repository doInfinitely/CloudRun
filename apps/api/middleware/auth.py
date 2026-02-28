"""JWT authentication middleware.

Protects API endpoints based on path prefixes. Public paths are
accessible without a token. All other paths require a valid JWT
in the Authorization header.

Set AUTH_ENABLED=1 and JWT_SECRET to activate. Disabled by default
for local development.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

log = logging.getLogger(__name__)

AUTH_ENABLED = os.getenv("AUTH_ENABLED", "0") == "1"
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# Paths that don't require authentication
PUBLIC_PATHS = {
    "/v1/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}
PUBLIC_PREFIXES = (
    "/uploads/",
)


def create_token(subject: str, role: str = "user", extra: dict | None = None) -> str:
    """Create a JWT token for a given subject and role."""
    import jwt
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRY_HOURS),
        **(extra or {}),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token. Returns payload or None."""
    try:
        import jwt
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None


class AuthMiddleware(BaseHTTPMiddleware):
    """JWT bearer token authentication middleware.

    When AUTH_ENABLED=1:
    - Public paths pass through without auth
    - All other paths require Authorization: Bearer <token>
    - Decoded token is stored in request.state.user
    - Admin routes require role=admin
    """

    async def dispatch(self, request: Request, call_next):
        if not AUTH_ENABLED:
            request.state.user = {"sub": "anonymous", "role": "admin"}
            return await call_next(request)

        path = request.url.path
        if path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return await call_next(request)

        # OPTIONS requests pass through for CORS
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization header"},
            )

        token = auth_header[7:]
        payload = decode_token(token)
        if payload is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"},
            )

        # Admin routes require admin role
        if path.startswith("/v1/admin") and payload.get("role") != "admin":
            return JSONResponse(
                status_code=403,
                content={"detail": "Admin access required"},
            )

        # Internal routes require internal token (separate check)
        if path.startswith("/internal/"):
            internal_token = request.headers.get("X-Internal-Token", "")
            if internal_token != os.getenv("INTERNAL_TOKEN", ""):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Invalid internal token"},
                )

        request.state.user = payload
        return await call_next(request)
