"""Seed baseline reference data: subjects and skill tags.

Run once against a fresh DB (after `alembic upgrade head`):
    python -m scripts.seed
"""

from app.core.database import SessionLocal
from app.models.question import SkillTag, SkillTagSlug
from app.models.subject import Subject, SubjectSlug

SUBJECTS = [
    (SubjectSlug.english, "اللغة الإنجليزية", "English"),
    (SubjectSlug.math, "الرياضيات", "Math"),
    (SubjectSlug.science, "العلوم", "Science"),
]

SKILL_TAGS = [
    (SkillTagSlug.memorization, "الحفظ"),
    (SkillTagSlug.comprehension, "الفهم"),
    (SkillTagSlug.application, "التطبيق"),
    (SkillTagSlug.analysis, "التحليل"),
]


def run():
    db = SessionLocal()
    try:
        for slug, name_ar, name_en in SUBJECTS:
            if not db.query(Subject).filter(Subject.slug == slug).first():
                db.add(Subject(slug=slug, name_ar=name_ar, name_en=name_en))

        for slug, label_ar in SKILL_TAGS:
            if not db.query(SkillTag).filter(SkillTag.slug == slug).first():
                db.add(SkillTag(slug=slug, label_ar=label_ar))

        db.commit()
        print("Seeded subjects and skill tags.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
