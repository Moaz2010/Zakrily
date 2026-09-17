"""Local lexical embeddings shared by ingestion and retrieval.

Feature hashing needs no download or API key; it matches words, not semantic
translations. Version metadata prevents mixing vectors from different models.
"""
import hashlib
import math
import re
from collections import Counter

from app.models.content_chunk import EMBEDDING_DIM

EMBEDDING_MODEL = "lexical-hash-v3"
STOP_WORDS = set("a an the is are was were be to of in on at for and or with what why how explain please me about this that it do does can lesson question answer".split())
# Arabic question words and connectors carry no lesson meaning, and leaving them
# in lets two unrelated questions match on "ما" and "هو" alone.
ARABIC_STOP_WORDS = set(
    "ما ماذا من هو هي هل اين أين متى لماذا ليه ازاي إزاي كيف ايه إيه في فى على عن مع "
    "بين الى إلى و او أو ثم كل هذا هذه ذلك التي الذي يعني بس كده ده دي عايز عاوز "
    "اشرح اشرحلي وضح فهمني درس سؤال جواب".split()
)
# Search aliases for lesson vocabulary across the three subjects.
ALIASES = {
    "الكائنات الحية": "living organisms", "الكائن الحي": "living organism",
    "كائن حي": "living organism", "كائنات حية": "living organisms",
    "غير الحية": "non living", "الجماد": "non living thing",
    "الأشياء غير الحية": "non living things",
    "الموطن": "habitat", "موطن": "habitat", "المواطن": "habitats",
    "البيئة": "environment", "التنفس": "breathing", "النمو": "growth",
    "التغذية": "feeding", "الغذاء": "food", "المأوى": "shelter",
    "النباتات": "plants", "الحيوانات": "animals", "النمل": "ants",
    "العقرب": "scorpion", "العقارب": "scorpions", "السحلية": "lizard",
    "العنكبوت": "spider", "العصفور": "sparrow", "الصخور": "rocks",
    "الصحراء": "desert", "الماء": "water", "الشمس": "sun",
    "الحواس": "senses", "حواس": "senses", "التذوق": "taste",
    "اللمس": "touch", "السمع": "hearing", "الإبصار": "sight",
    "البصر": "sight", "الشم": "smell", "اللسان": "tongue",
    "العادات الصحية": "healthy habits", "جحا": "goha",
    "القيمة المكانية": "place value", "قيمة مكانية": "place value",
    "الآحاد": "ones", "العشرات": "tens", "المئات": "hundreds",
    "الألوف": "thousands", "الكسور العشرية": "decimals",
    "المليون": "million", "المليار": "milliard", "الملیار": "milliard",
    "الأعداد": "numbers", "العدد": "number", "الرقم": "digit",
    "المنازل": "places", "المنزلة": "place", "الفترات": "periods",
    "الأعداد العشرية": "decimals", "الجمع": "addition", "الطرح": "subtraction",
    "المقارنة": "comparing", "التقريب": "rounding", "تقريب": "rounding",
}


ARABIC_DIACRITICS = re.compile(r"[ؗ-ًؚ-ْٰـ]")
# Clitics that attach to the front of an Arabic noun: و/ف/ب/ك/ل + the article ال.
ARABIC_PREFIX = re.compile(r"^(?:[وفبكل]?ال|[وفبكل])(?=\w{3,})")
ARABIC_SUFFIX = re.compile(r"(?:تها|ات|ين|ون|ها|هم|ية)$")
# Below this length a "suffix" is almost certainly part of the stem, so
# stripping it turns الكائن into كا and destroys the match.
MIN_STEM = 4


def normalize_arabic(text: str) -> str:
    """Fold the spelling variants that keep the same word from matching itself."""
    text = ARABIC_DIACRITICS.sub("", text)
    text = re.sub(r"[أإآٱ]", "ا", text)
    text = text.replace("ى", "ي").replace("ؤ", "و").replace("ئ", "ي").replace("ة", "ه")
    return text


def arabic_root(word: str) -> str:
    """Strip attached prefixes/suffixes so الكائنات, والكائن and كائن agree."""
    stripped = ARABIC_PREFIX.sub("", word) or word
    trimmed = ARABIC_SUFFIX.sub("", stripped)
    # Only accept the trim when enough stem survives to still be that word.
    if len(trimmed) >= MIN_STEM:
        stripped = trimmed
    return stripped


# Aliases keyed by normalized root, so a term matches in any inflected form
# rather than only the exact surface string that was written into ALIASES.
_ROOT_ALIASES = {}
for _phrase, _translation in ALIASES.items():
    _key = " ".join(arabic_root(word) for word in normalize_arabic(_phrase).split())
    _ROOT_ALIASES.setdefault(_key, _translation)
_MAX_ALIAS_WORDS = max((len(key.split()) for key in _ROOT_ALIASES), default=1)


def _apply_aliases(words: list[str]) -> list[str]:
    """Replace the longest matching alias phrase at each position."""
    out, i = [], 0
    while i < len(words):
        for size in range(min(_MAX_ALIAS_WORDS, len(words) - i), 0, -1):
            phrase = " ".join(words[i:i + size])
            translation = _ROOT_ALIASES.get(phrase)
            if translation:
                out.extend(translation.split())
                i += size
                break
        else:
            out.append(words[i])
            i += 1
    return out


def tokens(text: str) -> list[str]:
    text = normalize_arabic(text.casefold())
    words = re.findall(r"\w+", text)
    words = [arabic_root(word) if re.search(r"[؀-ۿ]", word) else word for word in words]
    words = _apply_aliases(words)
    words = [word for word in words
             if word not in STOP_WORDS and word not in ARABIC_STOP_WORDS]
    return [word[:-1] if len(word) > 4 and word.endswith("s") and not word.endswith("ss") else word
            for word in words]


def embed(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIM
    for token, count in Counter(tokens(text)).items():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % EMBEDDING_DIM
        vector[index] += (1 + math.log(count)) * (1 if digest[4] % 2 else -1)
    norm = math.sqrt(sum(value * value for value in vector))
    return [value / norm for value in vector] if norm else vector
