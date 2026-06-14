"""In-memory cache for registry / metadata / pin / preview lookups.

The cache is tiny and synchronous — Qiskit Metal discovery is
expected to run once per process lifetime and the results are small. A TTL
of 0 disables expiry.
"""
from __future__ import annotations

import os
import threading
import time
from typing import Any, Callable, Dict, Optional, Tuple, TypeVar

from app.config import settings

T = TypeVar("T")


class RegistryCache:
    def __init__(self, ttl_seconds: int = 0) -> None:
        self._ttl = ttl_seconds
        self._lock = threading.RLock()
        self._store: Dict[str, Tuple[float, Any]] = {}

    def get_or_set(self, key: str, factory: Callable[[], T]) -> T:
        now = time.monotonic()
        with self._lock:
            hit = self._store.get(key)
            if hit is not None:
                ts, value = hit
                if self._ttl == 0 or (now - ts) < self._ttl:
                    return value  # type: ignore[return-value]
            value = factory()
            self._store[key] = (now, value)
            return value

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            hit = self._store.get(key)
            if hit is None:
                return None
            ts, value = hit
            if self._ttl and (time.monotonic() - ts) >= self._ttl:
                self._store.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._store[key] = (time.monotonic(), value)

    def invalidate(self, key: Optional[str] = None) -> None:
        with self._lock:
            if key is None:
                self._store.clear()
            else:
                self._store.pop(key, None)

    def keys(self) -> list[str]:
        with self._lock:
            return list(self._store.keys())


registry_cache = RegistryCache(ttl_seconds=int(os.getenv("BRIDGE_CACHE_TTL", "0")))
