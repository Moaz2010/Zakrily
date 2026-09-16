"""Server-side grading, skill_scores aggregation, and lesson unlock logic (§6).

Shared thresholds used by persisted quiz grading and learner statistics.
"""

from app.core.config import settings


def is_passing(score: float) -> bool:
    return score >= settings.quiz_pass_threshold


def accuracy(correct: int, total: int) -> float | None:
    if total == 0:
        return None
    return correct / total


def has_sufficient_data(total: int) -> bool:
    return total >= settings.min_attempts_for_skill_display
