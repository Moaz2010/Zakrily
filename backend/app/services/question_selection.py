"""Practice selection (§6): weight(tag) = 1 - accuracy(tag), floored at 0.1.

Not yet wired into routers (those still return fixtures per BE-01).
"""

MIN_WEIGHT = 0.1


def tag_weight(accuracy: float | None) -> float:
    if accuracy is None:
        return 1.0
    return max(MIN_WEIGHT, 1 - accuracy)
