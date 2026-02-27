from __future__ import annotations
import time
from packages.db.session import SessionLocal
from packages.dispatch.expire import expire_offers

if __name__ == "__main__":
    db = SessionLocal()
    try:
        out = expire_offers(db, limit=500)
        db.commit()
        print(out)
    finally:
        db.close()
