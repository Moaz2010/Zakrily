"""Server-only grading for structured worksheet answers."""
import json
import re
import unicodedata
from decimal import Decimal, InvalidOperation


def numeric_value(value):
    if not isinstance(value, str) or len(value) > 100:
        return None
    value = unicodedata.normalize("NFKC", value).strip().replace("٬", ",").replace("٫", ".")
    # Group separators are allowed only in groups of three, not arbitrary positions.
    if not re.fullmatch(r"[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?", value):
        return None
    try:
        result = Decimal(value.replace(",", ""))
        return result if result.is_finite() else None
    except InvalidOperation:
        return None


def grade_interaction(data: dict, answer: str) -> bool:
    try:
        given = json.loads(answer)
    except (ValueError, TypeError):
        return False
    interaction = data["interaction"]
    slots = {slot["id"] for slot in interaction["slots"]}
    if not isinstance(given, dict) or set(given) != slots or any(not isinstance(v, str) or not v.strip() for v in given.values()):
        return False
    rule = data["math_rule"]
    if rule["kind"] == "exact":
        expected = rule["expected"]
        if rule.get("numeric"):
            return all(numeric_value(given[key]) is not None and numeric_value(given[key]) == numeric_value(value)
                       for key, value in expected.items())
        return given == expected
    values = [numeric_value(given[slot["id"]]) for slot in interaction["slots"]]
    if any(value is None or value != int(value) for value in values):
        return False
    if rule["kind"] == "range":
        return len(set(values)) == len(values) and all(rule["min"] <= value <= rule["max"] for value in values)
    if rule["kind"] == "difference":
        return all(100_000_000 <= value <= 999_999_999 for value in values) and abs(values[0] - values[1]) == 1_000_000
    if rule["kind"] == "missing_digit":
        value = values[0]
        if not 0 <= value <= 9:
            return False
        sides = [int(side.replace(",", "").replace("□", str(int(value)))) for side in rule["sides"]]
        return {"<": sides[0] < sides[1], ">": sides[0] > sides[1], "=": sides[0] == sides[1]}[rule["operator"]]
    if rule["kind"] == "place_condition":
        value = int(values[0])
        return len(str(value)) == rule["digits"] and (
            (value // rule["place"] % 10 < rule["digit"]) if rule["operator"] == "<"
            else (value // rule["place"] % 10 > rule["digit"])
        )
    return False
