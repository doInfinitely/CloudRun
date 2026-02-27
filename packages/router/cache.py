from __future__ import annotations
import time
from collections import OrderedDict
from typing import Any, Optional, Tuple

class TTLCache:
    """Tiny in-memory TTL LRU cache.

    Key should be hashable. Values can be any python object.
    """
    def __init__(self, max_items: int = 50_000, ttl_s: int = 30):
        self.max_items = max_items
        self.ttl_s = ttl_s
        self._data: OrderedDict[Any, Tuple[float, Any]] = OrderedDict()

    def get(self, key: Any) -> Optional[Any]:
        now = time.time()
        item = self._data.get(key)
        if not item:
            return None
        ts, val = item
        if now - ts > self.ttl_s:
            try:
                del self._data[key]
            except KeyError:
                pass
            return None
        # refresh LRU
        self._data.move_to_end(key, last=True)
        return val

    def set(self, key: Any, val: Any) -> None:
        now = time.time()
        self._data[key] = (now, val)
        self._data.move_to_end(key, last=True)
        while len(self._data) > self.max_items:
            self._data.popitem(last=False)
