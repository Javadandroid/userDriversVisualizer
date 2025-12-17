from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-key-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "1") == "1"
ALLOWED_HOSTS = [h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",") if h.strip()]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "snapshot",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES: list[dict] = []

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Dev-friendly CORS (front is usually on http://localhost:3000)
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "1") == "1"
if not CORS_ALLOW_ALL_ORIGINS:
    CORS_ALLOWED_ORIGINS = [
        o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()
    ]

# Snapshot generation controls
SNAPSHOT_MAX_COUNT = int(os.getenv("SNAPSHOT_MAX_COUNT", "1000"))
SNAPSHOT_REGEN_SECONDS = int(os.getenv("SNAPSHOT_REGEN_SECONDS", "20"))
SNAPSHOT_MATCH_RATIO = float(os.getenv("SNAPSHOT_MATCH_RATIO", "0.7"))
SNAPSHOT_BOUNDS = {
    # Tehran-ish bounding box
    "min_lat": float(os.getenv("SNAPSHOT_MIN_LAT", "35.60")),
    "max_lat": float(os.getenv("SNAPSHOT_MAX_LAT", "35.82")),
    "min_lng": float(os.getenv("SNAPSHOT_MIN_LNG", "51.20")),
    "max_lng": float(os.getenv("SNAPSHOT_MAX_LNG", "51.60")),
}

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    # This API is public for test purposes.
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
}
