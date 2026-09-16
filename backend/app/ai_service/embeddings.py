"""Local lexical embeddings shared by ingestion and retrieval.

Feature hashing needs no download or API key; it matches words, not semantic
translations. Version metadata prevents mixing vectors from different models.
"""
import hashlib
import math
import re
from collections import Counter

from app.models.content_chunk import EMBEDDING_DIM

EMBEDDING_MODEL = "lexical-hash-v1"
STOP_WORDS = set("a an the is are was were be to of in on at for and or with what why how explain please me about this that it do does can lesson question answer".split())
# Search aliases for the prepared English lesson in the existing Arabic UI.
ALIASES = {
    "الكائنات الحية": "living organisms", "غير الحية": "non living",
    "الموطن": "habitat", "موطن": "habitat", "المواطن": "habitats",
    "البيئة": "environment", "التنفس": "breathing", "النمو": "growth",
    "التغذية": "feeding", "الغذاء": "food", "المأوى": "shelter",
    "النباتات": "plants", "الحيوانات": "animals", "النمل": "ants",
    "العقرب": "scorpion", "العقارب": "scorpions", "السحلية": "lizard",
    "العنكبوت": "spider", "العصفور": "sparrow", "الصخور": "rocks",
    "الصحراء": "desert", "الماء": "water", "الشمس": "sun",
}


def tokens(text: str) -> list[str]:
    text = text.casefold()
    for phrase, translation in ALIASES.items():
        text = text.replace(phrase, translation)
    words = [word for word in re.findall(r"\w+", text) if word not in STOP_WORDS]
    return [word[:-1] if len(word) > 4 and word.endswith("s") and not word.endswith("ss") else word for word in words]


def embed(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIM
    for token, count in Counter(tokens(text)).items():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % EMBEDDING_DIM
        vector[index] += (1 + math.log(count)) * (1 if digest[4] % 2 else -1)
    norm = math.sqrt(sum(value * value for value in vector))
    return [value / norm for value in vector] if norm else vector
