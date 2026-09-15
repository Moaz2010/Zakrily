"""Shared Unit 1 catalog, also bundled into the frontend preview."""

import json
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parents[2] / "frontend" / "lib" / "curriculum.json"
SUBJECTS = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
LESSONS = {
    lesson["id"]: {**lesson, "subject_id": subject["id"], "unit": subject["unit"]}
    for subject in SUBJECTS
    for lesson in subject["lessons"]
}
