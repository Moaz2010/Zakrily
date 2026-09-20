"""Seed subjects, Unit 1 lesson names, and skill tags without overwriting content.

Run once against a fresh DB (after `alembic upgrade head`):
    python -m scripts.seed
"""

from app.core.database import SessionLocal
from app.models.question import SkillTag, SkillTagSlug
from app.models.subject import Subject, SubjectSlug
from app.models.lesson import Lesson
from app.curriculum import SUBJECTS as CURRICULUM

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

        db.flush()
        for subject in CURRICULUM:
            subject_row = db.query(Subject).filter(Subject.slug == SubjectSlug(subject["slug"])).one()
            for item in subject["lessons"]:
                lesson = db.query(Lesson).filter(
                    Lesson.subject_id == subject_row.id,
                    Lesson.order_index == item["order"],
                ).first()
                if lesson:
                    lesson.title = item["title"]
                else:
                    db.add(Lesson(
                        subject_id=subject_row.id, order_index=item["order"],
                        title=item["title"], objective="", is_published=False,
                    ))

        db.commit()
        # Publish the approved English Lesson 1 exercises from the source file
        # during the normal seed flow, so a fresh deployment has questions.
        from scripts.import_english_questions import run as import_english_questions
        import_english_questions()
        print("Seeded subjects, 16 Unit 1 lessons, and skill tags.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
