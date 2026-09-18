"""Mix math activity types without changing order on every request."""
from collections import defaultdict
from random import Random


def mixed_math_questions(bank, seed):
    groups = defaultdict(list)
    # Start from IDs so query ordering cannot change a learner's sequence.
    for question, tag in sorted(bank, key=lambda pair: pair[0].id):
        data = question.grading_data or {}
        kind = (data.get("interaction") or {}).get("kind", question.qtype.value)
        if not data.get("scored", True):
            kind = "reflection"
        groups[kind].append((question, tag))

    rng = Random(seed)
    kinds = sorted(groups)
    rng.shuffle(kinds)
    for kind in kinds:
        rng.shuffle(groups[kind])

    result = []
    previous = None
    while kinds:
        alternatives = [kind for kind in kinds if kind != previous]
        # Use the largest remaining group to avoid stranding a long run at the end.
        kind = max(alternatives or kinds, key=lambda key: len(groups[key]))
        result.append(groups[kind].pop())
        if not groups[kind]:
            kinds.remove(kind)
        previous = kind
    return result
