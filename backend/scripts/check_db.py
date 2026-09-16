from app.core.database import SessionLocal
from app.models.lesson import Lesson
from app.models.question import Question
from app.models.subject import Subject, SubjectSlug

def main():
    db = SessionLocal()
    try:
        science = db.query(Subject).filter_by(slug=SubjectSlug.science).first()
        print(f"Science Subject ID: {science.id if science else None}")

        lessons = db.query(Lesson).filter_by(subject_id=science.id).order_by(Lesson.order_index).all()
        for l in lessons:
            q_count = db.query(Question).filter_by(lesson_id=l.id).count()
            print(f"Lesson ID={l.id}, Order={l.order_index}, Title={l.title}, Questions={q_count}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
