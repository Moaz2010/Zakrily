"""Offline-only: suggest a skill tag for a question. Never authoritative — a human reviewer decides."""

from app.models.question import SkillTagSlug


def tag_question(body: str) -> SkillTagSlug:
    return SkillTagSlug.comprehension
