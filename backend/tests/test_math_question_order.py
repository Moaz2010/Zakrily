from collections import Counter
from types import SimpleNamespace

import pytest

from app.services.math_question_order import mixed_math_questions


@pytest.mark.parametrize("counts", [[], [1], [8], [5, 5, 3], [10, 2, 1], [4, 4, 4, 4]])
def test_mixing_keeps_every_question_and_minimizes_adjacent_repeats(counts):
    bank = []
    for kind, count in enumerate(counts):
        for _ in range(count):
            question = SimpleNamespace(id=len(bank) + 1, qtype=SimpleNamespace(value="short_answer"),
                                       grading_data={"interaction": {"kind": str(kind)}})
            bank.append((question, "tag"))
    mixed = mixed_math_questions(bank, "learner:lesson")
    assert Counter(q.id for q, _ in mixed) == Counter(q.id for q, _ in bank)
    kinds = [q.grading_data["interaction"]["kind"] for q, _ in mixed]
    repeats = sum(a == b for a, b in zip(kinds, kinds[1:]))
    assert repeats == max(0, 2 * max(counts, default=0) - sum(counts) - 1)
    assert mixed_math_questions(list(reversed(bank)), "learner:lesson") == mixed


def test_plain_questions_and_reflections_also_get_mixed():
    bank = [(SimpleNamespace(id=i, qtype=SimpleNamespace(value=kind), grading_data=data), "tag")
            for i, (kind, data) in enumerate([
                ("mcq", {}), ("mcq", {}), ("numeric", {}), ("numeric", {}),
                ("short_answer", {"scored": False}), ("short_answer", {"scored": False}),
            ])]
    mixed = mixed_math_questions(bank, "learner:lesson")
    assert all(a.qtype.value != b.qtype.value for (a, _), (b, _) in zip(mixed, mixed[1:]))
