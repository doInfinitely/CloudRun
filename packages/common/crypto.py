import hashlib, json

def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def stable_json(obj) -> bytes:
    # Deterministic JSON bytes for hashing
    return json.dumps(obj, separators=(",", ":"), sort_keys=True).encode("utf-8")
