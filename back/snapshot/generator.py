from __future__ import annotations

import math
import random
import secrets
import time
from dataclasses import dataclass
from threading import Lock
from typing import Any

from django.conf import settings


@dataclass(frozen=True)
class TrackedPoint:
    id: str
    lat: float
    lng: float


def _random_id(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(8)}"


def _rand_point(bounds: dict[str, float]) -> tuple[float, float]:
    lat = random.uniform(bounds["min_lat"], bounds["max_lat"])
    lng = random.uniform(bounds["min_lng"], bounds["max_lng"])
    return lat, lng


def _approx_dist2(a: TrackedPoint, b: TrackedPoint) -> float:
    # Fast-enough distance for "nearest" in a city-scale box.
    mean_lat_rad = math.radians((a.lat + b.lat) / 2.0)
    dx = (a.lng - b.lng) * math.cos(mean_lat_rad)
    dy = a.lat - b.lat
    return dx * dx + dy * dy


def _generate_points(prefix: str, n: int, bounds: dict[str, float]) -> list[TrackedPoint]:
    pts: list[TrackedPoint] = []
    for _ in range(n):
        lat, lng = _rand_point(bounds)
        pts.append(TrackedPoint(id=_random_id(prefix), lat=lat, lng=lng))
    return pts


def _match_nearest(
    drivers: list[TrackedPoint],
    users: list[TrackedPoint],
    match_count: int,
) -> list[dict[str, str]]:
    if match_count <= 0 or not drivers or not users:
        return []

    # Greedy "global nearest pairs":
    # build all pair distances (<= 1e6), sort, then pick first non-conflicting pairs.
    pairs: list[tuple[float, int, int]] = []
    for di, d in enumerate(drivers):
        for ui, u in enumerate(users):
            pairs.append((_approx_dist2(d, u), di, ui))
    pairs.sort(key=lambda x: x[0])

    used_drivers: set[int] = set()
    used_users: set[int] = set()
    out: list[dict[str, str]] = []
    for _, di, ui in pairs:
        if di in used_drivers or ui in used_users:
            continue
        used_drivers.add(di)
        used_users.add(ui)
        out.append({"driver": drivers[di].id, "user": users[ui].id})
        if len(out) >= match_count:
            break
    return out


def generate_snapshot(
    *,
    max_count: int,
    bounds: dict[str, float],
    drivers_count: int | None = None,
    users_count: int | None = None,
    match_ratio: float = 0.7,
    seed: int | None = None,
) -> dict[str, Any]:
    if seed is not None:
        random.seed(seed)

    drivers_n = drivers_count if drivers_count is not None else random.randint(0, max_count)
    users_n = users_count if users_count is not None else random.randint(0, max_count)

    drivers_n = max(0, min(max_count, drivers_n))
    users_n = max(0, min(max_count, users_n))

    drivers = _generate_points("driver", drivers_n, bounds)
    users = _generate_points("user", users_n, bounds)

    limit = min(len(drivers), len(users))
    # Prefer higher matching density: ~70% of the smaller side by default (configurable).
    # Still keep a bit of randomness so it doesn't look "locked" each refresh.
    if limit > 0:
        ratio = max(0.0, min(1.0, float(match_ratio)))
        base = int(round(limit * ratio))
        jitter = max(0, int(round(limit * 0.1)))  # ±10% jitter
        low = max(0, min(limit, base - jitter))
        high = max(0, min(limit, base + jitter))
        match_count = random.randint(low, high)
    else:
        match_count = 0
    matchs = _match_nearest(drivers, users, match_count)

    return {
        "drivers": [{"id": d.id, "lat": d.lat, "lng": d.lng} for d in drivers],
        "users": [{"id": u.id, "lat": u.lat, "lng": u.lng} for u in users],
        "matchs": matchs,
    }


_lock = Lock()
_state: dict[str, Any] = {"generated_at": 0.0, "snapshot": None}


def get_cached_snapshot(
    *,
    regen_seconds: int,
    max_count: int,
    bounds: dict[str, float],
    drivers_count: int | None = None,
    users_count: int | None = None,
    match_ratio: float = 0.7,
    force: bool = False,
    seed: int | None = None,
) -> dict[str, Any]:
    # If counts are explicitly requested, always regenerate to match the request.
    if drivers_count is not None or users_count is not None:
        force = True

    now = time.time()
    with _lock:
        snapshot = _state.get("snapshot")
        generated_at = float(_state.get("generated_at") or 0.0)

        if force or snapshot is None or (now - generated_at) >= regen_seconds:
            snapshot = generate_snapshot(
                max_count=max_count,
                bounds=bounds,
                drivers_count=drivers_count,
                users_count=users_count,
                match_ratio=match_ratio,
                seed=seed,
            )
            _state["snapshot"] = snapshot
            _state["generated_at"] = now

        return snapshot


def default_config() -> tuple[int, int, dict[str, float]]:
    return (
        settings.SNAPSHOT_REGEN_SECONDS,
        settings.SNAPSHOT_MAX_COUNT,
        settings.SNAPSHOT_BOUNDS,
        settings.SNAPSHOT_MATCH_RATIO,
    )
