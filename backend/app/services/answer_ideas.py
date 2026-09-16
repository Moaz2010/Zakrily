"""Conservative idea matching for written answers, without a model/API dependency.

Ignore sentence scaffolding, recognise lesson synonyms and small spelling errors.
Every required concept must still be present; choice/numeric grading bypasses this.
"""
import re
import unicodedata

FILLER = set("a an the by using use used with and or of to in on at for from its it is are was were be being been this that these those then than as such about because since they them their you your we our can could should must will would have has had do does did some also both one very proper properly prpar writing write written describing describe descriptive sentences sentence when while until get gets getting give gives including includes include which who what how where example examples called considered first step during observing observation organism organisms living".split())
SYNONYMS = {
    "magnifying glass": "magnifier", "magnifying glasses": "magnifier", "glass": "magnifier",
    "record card": "recordcard", "recording card": "recordcard", "observation card": "recordcard",
    "colour": "color", "colours": "color", "colors": "color", "sizes": "size", "shapes": "shape",
    "location": "place", "locations": "place", "topic": "title", "sketch": "drawing",
    "back and front": "backforth", "back and forth": "backforth", "backwards and forwards": "backforth",
    "forward and backward": "backforth", "backward and forward": "backforth",
    "close to": "near", "cannot": "not", "can't": "not", "do not": "not", "don't": "not",
    "without": "no", "doesn't": "not", "does not": "not", "isn't": "not",
    "shading": "shade", "shaded": "shade", "shadows": "shade", "drawing": "drawing",
    "eyes": "eye", "hands": "hand", "gloves": "glove", "shoes": "shoe", "shose": "shoe",
    "size": "size", "thin": "thin", "fine": "thin", "lines": "line", "clear": "clear",
    "precise": "exact", "specific": "exact", "accurate": "exact",
}
# These words carry scientific meaning, even when surrounding prose is omitted.
FILLER -= {"living", "organism", "organisms", "observation", "sentences", "sentence", "describe", "descriptive", "describing"}
SYNONYMS.update({"sentences": "sentence", "describing": "describe", "description": "describe"})
SYNONYMS.update({"where it is found": "place", "where i found it": "place", "where it was found": "place",
                 "how big it is": "size", "how large it is": "size", "what it looks like": "shape"})


def words(text):
    text = unicodedata.normalize("NFKC", text).casefold().replace("’", "'")
    for phrase in sorted(SYNONYMS, key=len, reverse=True):
        text = re.sub(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", SYNONYMS[phrase], text)
    return [w for w in re.findall(r"\w+(?:\.\d+)?", text) if w not in FILLER]


def close_word(expected, actual):
    if expected == actual:
        return True
    # Do not confuse numbers or short scientific words (e.g. sun / run).
    if min(len(expected), len(actual)) < 5 or not expected.isalpha() or not actual.isalpha():
        return False
    if len(expected) == len(actual):
        differences = [i for i, (a, b) in enumerate(zip(expected, actual)) if a != b]
        return (len(differences) == 2 and differences[1] == differences[0] + 1
                and expected[differences[0]] == actual[differences[1]]
                and expected[differences[1]] == actual[differences[0]])
    short, long = sorted((expected, actual), key=len)
    return len(long) == len(short) + 1 and any(long[:i] + long[i + 1:] == short for i in range(len(long)))


def includes(actual, phrase):
    expected = words(phrase)
    return bool(expected) and all(any(close_word(word, candidate) for candidate in actual) for word in expected)


def matches_ideas(answer, expected, rubric=None):
    actual = words(answer)
    if not actual or "cannot be determined" in expected.casefold():
        return False
    if " ".join(answer.casefold().split()) == " ".join(expected.casefold().split()):
        return True
    rubric = rubric or {}
    if rubric.get("groups"):
        # Negated statements and explicit contrary claims must not earn marks.
        if any(includes(actual, phrase) for phrase in rubric.get("forbidden", [])):
            return False
        if any(word in actual for word in ("not", "never", "no")) and not rubric.get("allow_negative"):
            return False
        return all(any(includes(actual, alternative) for alternative in group) for group in rubric["groups"])
    required = words(expected)
    negative = {"not", "no", "never"}
    if bool(negative.intersection(actual)) != bool(negative.intersection(required)):
        return False
    # Single-letter choices and symbol sequences must stay exact.
    if not required or all(len(w) < 2 for w in required):
        return answer.strip().casefold() == expected.strip().casefold()
    return all(any(close_word(word, candidate) for candidate in actual) for word in required)


def observation_rubric(number):
    """Required ideas for the prepared Science Lesson 2 written questions."""
    groups = {
        1: [["magnifying glass", "magnifier"]],
        2: [["face"], ["magnifying glass", "magnifier"]],
        3: [["record card"]],
        4: [["topic"]],
        5: [["size"], ["color"]],
        10: [["size"], ["color"], ["shape"], ["location"]],
        11: [["topic"], ["date"], ["grade", "class"], ["name"], ["sketch"],
             ["size"], ["color"], ["shape"], ["location"], ["learned", "learnt", "questions"]],
        12: [["magnifying glass", "magnifier"], ["near eye"], ["move face", "moving face"], ["backforth"]],
        13: [["near eye"], ["move leaf", "moving leaf"], ["backforth"]],
        19: [["topic"]],
        20: [["date"], ["name"], ["sketch"], ["sentences to describe", "description"]],
        21: [["thin line"], ["clear line"], ["no shade", "not shade"]],
        22: [["exact size", "3.5 cm"], ["exact place", "garden"], ["clear observation", "clear scientific"]],
    }
    if number not in groups:
        return {}
    return {"groups": groups[number], "allow_negative": number == 21,
            "forbidden": ["far eye"] if number in (12, 13) else []}
