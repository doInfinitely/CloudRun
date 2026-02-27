from __future__ import annotations

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from packages.db.session import SessionLocal
from packages.common.idempotency import get_or_set as idem_get_or_set

# Apply to selected mutating routes to provide uniform behavior.
# For now we guard only POST endpoints listed in IDEMPOTENT_ROUTES.

IDEMPOTENT_ROUTES = {
    ("POST", re_path): True
    for re_path in [
        r"^/v1/orders/[^/]+/verify_age$",
        r"^/v1/orders/[^/]+/payment/authorize$",
        r"^/v1/orders/[^/]+/doorstep_id_check/submit$",
        r"^/v1/orders/[^/]+/deliver/confirm$",
        r"^/v1/tasks/[^/]+/accept$",
        r"^/v1/orders/[^/]+/refuse$",  # new endpoint
    ]
}

import re

def _matches(method: str, path: str) -> bool:
    for (m, pat) in IDEMPOTENT_ROUTES.keys():
        if m == method and re.match(pat, path):
            return True
    return False

class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        if method != "POST" or not _matches(method, path):
            return await call_next(request)

        idem_key = request.headers.get("Idempotency-Key")
        if not idem_key:
            return JSONResponse({"detail": "Idempotency-Key header required"}, status_code=400)

        # Read request body bytes once; store for downstream.
        body_bytes = await request.body()
        # Rebuild request stream for downstream handlers
        async def receive():
            return {"type": "http.request", "body": body_bytes, "more_body": False}
        request._receive = receive  # type: ignore[attr-defined]

        # Build request body json if possible; else store bytes hash
        try:
            body_json = await request.json()
        except Exception:
            body_json = {"_raw_bytes_len": len(body_bytes)}

        db = SessionLocal()
        try:
            # Attempt replay first by calling compute that will be overridden by downstream.
            # We can't "compute" here without executing handler; so we implement a two-phase approach:
            # 1) check if exists -> replay immediately
            from packages.db.models import IdempotencyKey
            existing = db.query(IdempotencyKey).filter(IdempotencyKey.key == idem_key, IdempotencyKey.route == f"{method}:{path}").one_or_none()
            if existing:
                return JSONResponse(existing.response_json, status_code=existing.status_code)

            # 2) execute handler, then store response.
            response = await call_next(request)

            # Only store JSON responses
            # Note: FastAPI may stream; here we read body fully.
            resp_body = b""
            async for chunk in response.body_iterator:
                resp_body += chunk

            # Recreate response to return to client
            try:
                import json
                resp_json = json.loads(resp_body.decode("utf-8") or "{}")
            except Exception:
                resp_json = {"_non_json_response": True}

            # Persist idempotency record if handler didn't already
            try:
                def compute():
                    return response.status_code, resp_json

                idem_get_or_set(
                    db,
                    key=idem_key,
                    route=f"{method}:{path}",
                    request_body=body_json,
                    compute=compute,
                )
                db.commit()
            except Exception:
                db.rollback()

            return JSONResponse(resp_json, status_code=response.status_code, headers=dict(response.headers))
        finally:
            db.close()
