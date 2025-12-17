# Backend (Django + DRF)

This folder contains a small Django REST Framework backend that returns exactly the JSON shape expected by the frontend:

- `GET /api/snapshot/` → `{ drivers, users, matchs }`

The data is mock + randomly generated (up to 1000 drivers and 1000 users). Matches are built using a greedy “nearest distance” strategy. Snapshots are cached and regenerated on a timer.

## Project Structure

- `back/manage.py`
- `back/config/` Django settings + root routing
- `back/snapshot/`
  - `views.py` API views
  - `generator.py` random generator + matching algorithm + in-memory cache

## Run Steps

1. Create a venv and install deps:
   - `python -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -r requirements.txt`
2. Run the server:
   - `python manage.py runserver 0.0.0.0:8000`
3. Test:
   - `http://localhost:8000/api/snapshot/`

## Environment Variables

- `SNAPSHOT_REGEN_SECONDS` (default: `20`) regenerate snapshot every N seconds
- `SNAPSHOT_MAX_COUNT` (default: `1000`) max drivers/users count
- `SNAPSHOT_MATCH_RATIO` (default: `0.7`) target match density vs the smaller side (with some randomness)
- Coordinate bounds (Tehran-ish by default):
  - `SNAPSHOT_MIN_LAT` / `SNAPSHOT_MAX_LAT`
  - `SNAPSHOT_MIN_LNG` / `SNAPSHOT_MAX_LNG`
- CORS for local dev:
  - `CORS_ALLOW_ALL_ORIGINS` (default: `1`)

## Query Params (Optional)

- `drivers=234` and/or `users=107` → force regenerate with these exact counts
- `regen_seconds=10` → override cache regeneration interval
- `match_ratio=0.7` → override match ratio (0..1)
- `force=1` → force regenerate even if cache is fresh
- `seed=123` → deterministic output for debugging
- `meta=1` → include `_meta` in the response (by default the response has only the 3 keys)
