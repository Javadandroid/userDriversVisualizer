from __future__ import annotations

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from .generator import default_config, get_cached_snapshot


class HealthView(APIView):
    def get(self, request):
        return Response({"ok": True})


class SnapshotView(APIView):
    def get(self, request):
        regen_seconds_default, max_count_default, bounds_default, match_ratio_default = default_config()

        def int_param(name: str) -> int | None:
            v = request.query_params.get(name)
            if v is None or v == "":
                return None
            return int(v)

        def bool_param(name: str) -> bool:
            v = request.query_params.get(name, "")
            return v.lower() in {"1", "true", "yes", "y", "on"}

        regen_seconds = int_param("regen_seconds") or regen_seconds_default
        max_count = int_param("max_count") or max_count_default
        drivers_count = int_param("drivers")
        users_count = int_param("users")
        seed = int_param("seed")
        force = bool_param("force")
        match_ratio = request.query_params.get("match_ratio")
        match_ratio_val = float(match_ratio) if match_ratio not in (None, "") else match_ratio_default

        regen_seconds = max(1, min(60 * 60, regen_seconds))
        max_count = max(1, min(1000, max_count))
        match_ratio_val = max(0.0, min(1.0, match_ratio_val))

        snapshot = get_cached_snapshot(
            regen_seconds=regen_seconds,
            max_count=max_count,
            bounds=bounds_default,
            drivers_count=drivers_count,
            users_count=users_count,
            match_ratio=match_ratio_val,
            force=force,
            seed=seed,
        )
        # Return exactly the JSON shape expected by the frontend:
        # { drivers: [...], users: [...], matchs: [...] }
        # (Optional debug: ?meta=1)
        if bool_param("meta"):
            snapshot = {
                **snapshot,
                "_meta": {
                    "regen_seconds": regen_seconds,
                    "max_count": max_count,
                    "match_ratio": match_ratio_val,
                    "bounds": bounds_default,
                    "debug": settings.DEBUG,
                },
            }

        return Response(snapshot)
