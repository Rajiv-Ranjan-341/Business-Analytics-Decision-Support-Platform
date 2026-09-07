import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
SAMPLE_DIR = DATA_DIR / "sample"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{BASE_DIR / 'bizoptai.db'}"

MAX_UPLOAD_SIZE_MB = 50
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
