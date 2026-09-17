from enum import Enum


class SubjectSlugEnum(str, Enum):
    english = "english"
    math = "math"
    science = "science"


class SkillTagEnum(str, Enum):
    memorization = "memorization"
    comprehension = "comprehension"
    application = "application"
    analysis = "analysis"


class QuestionTypeEnum(str, Enum):
    mcq = "mcq"
    short_answer = "short_answer"
    numeric = "numeric"


class LessonStatusEnum(str, Enum):
    locked = "locked"
    unlocked = "unlocked"
    completed = "completed"


class AttemptContextEnum(str, Enum):
    lesson_quiz = "lesson_quiz"
    practice = "practice"


class ChatModeEnum(str, Enum):
    lesson_explain = "lesson_explain"
    english_convo = "english_convo"
    science_explain = "science_explain"


class MathVerdictEnum(str, Enum):
    correct = "correct"
    incorrect = "incorrect"
    unreadable = "unreadable"


class UserRoleEnum(str, Enum):
    student = "student"
    parent = "parent"
