"""Redis-backed sliding window rate limiter middleware.

Limits requests per IP address per window. Set RATE_LIMIT_ENABLED=1 to activate.
Disabled by default for local development.
"""
from __future__ import annotations

import os
import time
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

log = logging.getLogger(__name__)

RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "0") == "1"
RATE_LIMIT_RPM = int(os.getenv("RATE_LIMIT_RPM", "120"))  # requests per minute
RATE_LIMIT_WINDOW = 60  # seconds

# Paths exempt from rate limiting
EXEMPT_PATHS = {"/v1/health"}


def _get_redis():
    """Lazy Redis connection."""
    try:
        import redis
        url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        return redis.from_url(url)
    except Exception:
        return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding window rate limiter using Redis sorted sets.

    Each IP gets a sorted set with timestamps. Requests outside the
    window are pruned, and the remaining count is checked against
    RATE_LIMIT_RPM. Returns 429 if exceeded.
    """

    def __init__(self, app):
        super().__init__(app)
        self._redis = None

    async def dispatch(self, request: Request, call_next):
        if not RATE_LIMIT_ENABLED:
            return await call_next(request)

        if request.url.path in EXEMPT_PATHS:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{client_ip}"

        try:
            if self._redis is None:
                self._redis = _get_redis()

            if self._redis is not None:
                now = time.time()
                window_start = now - RATE_LIMIT_WINDOW

                pipe = self._redis.pipeline()
                pipe.zremrangebyscore(key, 0, window_start)
                pipe.zcard(key)
                pipe.zadd(key, {str(now): now})
                pipe.expire(key, RATE_LIMIT_WINDOW + 1)
                results = pipe.execute()

                count = results[1]
                if count >= RATE_LIMIT_RPM:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Rate limit exceeded. Try again later."},
                        headers={"Retry-After": str(RATE_LIMIT_WINDOW)},
                    )
        except Exception as e:
            log.warning("Rate limiter error (allowing request): %s", e)

        return await call_next(request)
