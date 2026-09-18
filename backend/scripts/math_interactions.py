"""Adapt the supplied Math worksheets into explicit, answer-safe activities.

All expected placements are stored separately from the public interaction.
Unknown diagrams/prose are never converted into invented scored questions.
"""
import hashlib
import re

from app.schemas.math_interaction import MathInteraction

PLACES = ["Ones", "Tens", "Hundreds", "Thousands", "Ten Thousands", "Hundred Thousands",
          "Millions", "Ten Millions", "Hundred Millions", "Milliards", "Ten Milliards"]
DIGITS = [{"id": str(n), "label": str(n)} for n in range(10)]
NUM = r"\d[\d,]*"
WORDS = dict(zip("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(), range(20)))
WORDS.update(dict(zip("twenty thirty forty fifty sixty seventy eighty ninety".split(), range(20, 100, 10))))
SCALES = {"thousand": 1000, "million": 1000000, "milliard": 1000000000, "billion": 1000000000}


def number_value(text: str) -> int | None:
    text = text.strip().strip(".() ").lower().replace(",", "").replace("-", " ")
    if re.fullmatch(r"\d+", text):
        return int(text)
    units = re.fullmatch(r"(\d+)\s+(ten|hundred)s?(?:\s+(thousand|million|milliard)s?)?", text)
    if units:
        return int(units[1]) * {"ten": 10, "hundred": 100}[units[2]] * SCALES.get(units[3], 1)
    if "+" in text:
        parts = [number_value(part) for part in text.split("+")]
        return sum(parts) if all(p is not None for p in parts) else None
    if "×" in text:
        parts = [number_value(part) for part in text.split("×")]
        return parts[0] * parts[1] if len(parts) == 2 and None not in parts else None
    total, group = 0, 0
    for word in text.split():
        word = word.rstrip("s")
        if word == "and":
            continue
        if word.isdigit():
            group += int(word)
        elif word in WORDS:
            group += WORDS[word]
        elif word == "hundred":
            group = (group or 1) * 100
        elif word in SCALES:
            total += (group or 1) * SCALES[word]
            group = 0
        elif word == "ten":
            group += 10
        else:
            return None
    return total + group if text else None


def slot(key, label, **extra):
    return {"id": str(key), "label": label, **extra}


def activity(kind, instruction, slots, expected=None, numeric=False, rule=None, **kwargs):
    public = MathInteraction(kind=kind, instruction=instruction, slots=slots, **kwargs).model_dump(exclude_none=True)
    private = rule or {"kind": "exact", "expected": expected, "numeric": numeric}
    return {"interaction": public, "math_rule": private, "scored": True}


def ordered_cards(labels, expected_labels, instruction, number=None):
    # IDs and initial card order must not encode the solution order.
    tokens = [{"id": hashlib.sha256(f"{label}|{index}".encode()).hexdigest()[:10], "label": label}
              for index, label in enumerate(labels)]
    remaining = list(tokens)
    expected = {}
    for index, label in enumerate(expected_labels):
        token = next(t for t in remaining if t["label"] == label)
        expected[str(index)] = token["id"]
        remaining.remove(token)
    tokens.sort(key=lambda token: token["id"])
    return activity("order", instruction, [slot(i, str(i + 1)) for i in range(len(labels))], expected,
                    tokens=tokens, number=number)


def extra_parts(lesson, number, body, answer):
    """Explicitly authored splits for compound tasks without lettered answers."""
    if (lesson, number) == (4, 3):
        return [
            ("a", "Decompose 6,124,030,420.", "(6 × 1,000,000,000) + (1 × 100,000,000) + (2 × 10,000,000) + (4 × 1,000,000) + (3 × 10,000) + (4 × 100) + (2 × 10)"),
            ("achart", "Complete the place-value chart for 6,124,030,420.", "6,124,030,420"),
            ("b", "Compose the number: Milliards 5 | Millions 4, 0, 0 | Thousands 1, 5, 9 | Ones 0, 2, 4.", "5,400,159,024"),
            ("bexpanded", "Decompose 5,400,159,024.", "(5 × 1,000,000,000) + (4 × 100,000,000) + (1 × 100,000) + (5 × 10,000) + (9 × 1,000) + (2 × 10) + (4 × 1)"),
            ("c", "Compose: (7 × 1,000,000,000) + (5 × 10,000,000) + (4 × 10,000) + (3 × 1,000) + (5 × 100) + (9 × 1).", "7,050,043,509"),
            ("cchart", "Complete the place-value chart for 7,050,043,509.", "7,050,043,509"),
        ]
    if (lesson, number) == (4, 9):
        return [("composed", "Compose the number: Milliards 2 | Millions 8, 0, 5 | Thousands 4, 0, 0 | Ones 6, 9, 3.", "2,805,400,693"),
                ("expanded", "Decompose 2,805,400,693.", "(2 × 1,000,000,000) + (8 × 100,000,000) + (5 × 1,000,000) + (4 × 100,000) + (6 × 100) + (9 × 10) + (3 × 1)")]
    if (lesson, number) == (2, 4):
        digits = "5, 7, 3, 1, 8, 2, 9 and 6"
        return [("greatest", f"Use the digits {digits} to make the greatest number.", "98,765,321"),
                ("smallest", f"Use the digits {digits} to make the smallest number.", "12,356,789"),
                ("change", "How many times smaller is the value of 7 in 12,356,789 than in 98,765,321?", "1,000")]
    if (lesson, number) == (8, 32):
        digits = "7, 4, 2, 0, 3, 5, 6, 8"
        return [("greatest", f"Use the digits {digits} to make the greatest number.", "87,654,320"),
                ("smallest", f"Use the digits {digits} to make the smallest number.", "20,345,678"),
                ("roundgreatest", "Round 87,654,320 to the nearest Million.", "88,000,000"),
                ("roundsmallest", "Round 20,345,678 to the nearest Million.", "20,000,000")]
    return []


def adapt(lesson, number, part, body, answer, qtype, options, correct):
    lower = body.lower()
    clean = re.sub(r"\*\*|`", "", answer).strip().rstrip(".")
    # Shape placement uses positions, so identical digits in different places
    # cannot accidentally receive credit.
    if (lesson, number) == (1, 1):
        target = re.findall(r"\d[\d,]{4,}", body)[-1]
        count = len(target.replace(",", ""))
        return f"Mark the requested digits in {target}.", activity("mark_digits", "اسحب كل علامة للرقم المطلوب، أو اختار العلامة واضغط على الرقم.",
            [slot("underline", "Hundred Thousands", shape="underline"), slot("circle", "Ten Millions", shape="circle"), slot("square", "Milliards", shape="square")],
            {"underline": str(count - 6), "circle": str(count - 8), "square": str(count - 10)}, number=target)

    if (lesson, number) == (1, 4) or (lesson == 4 and part.endswith("chart")):
        target = re.findall(r"\d[\d,]{4,}", body)[-1]
        digits = target.replace(",", "")
        places = list(reversed(PLACES[:10]))
        expected = dict(zip([str(i) for i in range(10)], digits.rjust(10, "—")))
        return f"Complete the place-value chart for {target}.", activity("slots", "وزّع الأرقام على منازلها. استخدم — للمنازل اللي قبل بداية العدد.",
            [slot(i, name) for i, name in enumerate(places)], expected, tokens=DIGITS + [{"id": "—", "label": "—"}], reusable=True, number=target)

    # Select digits directly, rather than typing a numeral detached from its place.
    if (lesson, number) == (1, 5):
        target = "1,542,345,678"
        place = re.search(r"(?:what digit is in the)\s+(.+?)\s+place", body, re.I)[1]
        place = re.sub(r"^One ", "", place, flags=re.I)
        index = next((i for i, name in enumerate(PLACES) if name.lower() == place.lower()), None)
        if index is not None:
            return body, activity("mark_digits", "اختار العلامة، وبعدها اضغط على الرقم في المنزل المطلوب.",
                [slot("digit", place, shape="circle")], {"digit": str(9-index)}, number=target)

    # Keep source choices (including textual alternatives) unless all are signs.
    if options:
        return body, None

    if (lesson, number) in {(5, 6), (5, 7)}:
        left, right, expected = (("24,152,614", "24,125,614", ">") if number == 6
                                 else ("13,495 − 1,000", "23,495 − 10,000", "<"))
        return ("Correct the comparison." if number == 6 else "Calculate both sides, then compare."), activity("compare", "احسب وقارن، وبعدين حط العلامة الصحيحة.",
            [slot("sign", "Comparison sign")], {"sign": expected}, tokens=[{"id": s, "label": s} for s in ["<", "=", ">"]], left=left, right=right)

    # Comparison gaps support expressions and words as well as standard form.
    if clean in {"<", ">", "="} and re.search(r"_{2,}", body):
        sides = re.split(r"_{2,}", body, maxsplit=1)
        left = re.sub(r"^(?:(?:Compare|Write)[^.]+\.\s*|Compare\.\s*)+", "", sides[0]).strip()
        return "Compare the two numbers.", activity("compare", "اسحب علامة المقارنة للمربع، أو اختارها واضغط على المربع.",
            [slot("sign", "Comparison sign")], {"sign": clean}, tokens=[{"id": s, "label": s} for s in ["<", "=", ">"]], left=left, right=sides[1].strip())

    if "□" in body and lesson == 5:
        expression = re.search(r"([\d,□]+)\s*([<>=])\s*([\d,□]+)", body)
        if expression:
            left, operator, right = expression.groups()
            return f"Fill the missing digit: {left} {operator} {right}", activity("slots", "حط رقم في المربع علشان المقارنة تبقى صحيحة.",
                [slot("digit", f"{left} {operator} {right}", shape="square")], tokens=DIGITS, reusable=True,
                rule={"kind": "missing_digit", "sides": [left, right], "operator": operator})

    if (lesson, number) == (5, 5) and part in "abc":
        digits, place, digit, operator = {"a": (6, 100000, 8, "<"), "b": (9, 1000000, 8, ">"), "c": (8, 10000000, 3, "<")}[part]
        return body, activity("fields", "اكتب أي عدد يحقق الشرط. فيه أكتر من إجابة صحيحة!", [slot("number", "Your number")],
            rule={"kind": "place_condition", "digits": digits, "place": place, "digit": digit, "operator": operator})

    if (lesson, number) == (3, 6):
        return body, activity("fields", "اكتب عددين من ٩ أرقام، الفرق بينهم مليون.", [slot("first", "First number"), slot("second", "Second number")], rule={"kind": "difference"})
    if (lesson, number) == (8, 12):
        return body, activity("fields", "اكتب ٥ أعداد مختلفة. كلهم لازم يتقربوا إلى 312,000.", [slot(i, f"Number {i+1}") for i in range(5)], rule={"kind": "range", "min": 311500, "max": 312499})
    if (lesson, number) == (8, 13):
        return body, activity("fields", "اكتشف أول وآخر عدد في مجال التقريب.", [slot("least", "Least"), slot("greatest", "Greatest")], {"least": "250000", "greatest": "349999"}, numeric=True)

    # Number-building tasks use exactly the supplied digits, including zeros.
    if ("smallest" in lower or "greatest" in lower) and re.search(r"(?:digits?|formed from)\s+\d\s*,", lower):
        digits_match = re.search(r"(?:digits?|formed from)\s+((?:\d\s*[, ]\s*)+(?:and\s*)?\d)", lower)
        target = number_value(clean)
        if digits_match and target is not None:
            digits = re.findall(r"\d", digits_match[1])
            if sorted(digits) == sorted(str(target)):
                return body, ordered_cards(digits, list(str(target)), "رتّب كل الأرقام علشان تكوّن العدد. الصفر مينفعش يكون في البداية.")

    # Rounding: the number line provides a scale, not the answer or midpoint.
    if lesson == 8 and "nearest" in lower and number not in {12, 13, 28}:
        nearest = re.search(r"nearest\s+([\w ,]+?)(?:[.()]|$)", body, re.I)
        if nearest:
            place = nearest[1].strip().replace("the ", "")
            step = number_value(place)
            values = re.findall(NUM, body)
            # Lettered parts append their value after the shared rounding prompt.
            value = int(values[0].replace(",", "")) if values else None
            if number in range(2, 9):
                value = int(values[-1].replace(",", "")) if values else None
            if step and value is not None:
                lo = value // step * step
                hi = lo + step
                rounded = lo if value-lo < step/2 else hi
                return f"Round {value:,} to the nearest {step:,}.", activity("number_line", "اكتب المنتصف، وبعدين اختار الطرف الأقرب للعدد. عند المنتصف بنقرّب لفوق.",
                    [slot("midpoint", "Midpoint"), slot("rounded", "Rounded number")],
                    {"midpoint": str(lo+step//2), "rounded": str(rounded)}, numeric=True, lower=lo, upper=hi, value=value)

    # Word form is assembled in meaningful phrases rather than exact prose typing.
    if "word form" in lower or (lesson, number) == (1, 2):
        phrases = [p.strip().rstrip(".") for p in clean.split(",") if p.strip()]
        if len(phrases) >= 2 and all(number_value(p) is not None for p in phrases):
            return body, ordered_cards(phrases, phrases, "رتّب بطاقات الكلمات من البداية للنهاية علشان تقرأ العدد.")

    # Expanded and product forms: every place gets a coefficient, including 0.
    if "+" in clean and number_value(clean) is not None:
        value = number_value(clean)
        digits = str(value)
        powers = list(reversed(range(len(digits))))
        return body, activity("slots", "كوّن الصورة التحليلية: حط رقم في كل منزل، وحط 0 لو المنزل فاضي.",
            [slot(str(power), f"× {10**power:,}") for power in powers],
            dict(zip(map(str, powers), digits)), tokens=DIGITS, reusable=True)

    # Place-name answers become explicit choices, including neighbouring places.
    place_answer = clean.lower().rstrip("s")
    if any(place_answer == p.lower().rstrip("s") for p in PLACES):
        name = next(p for p in PLACES if place_answer == p.lower().rstrip("s"))
        return body, activity("slots", "اختار اسم المنزل، وحطه في خانة الإجابة.", [slot("place", "Place value")], {"place": name},
            tokens=[{"id": p, "label": p} for p in PLACES[:10]])

    if (lesson, number) == (1, 8) and part in {"a", "b"}:
        values = re.findall(NUM, clean)
        labels = ["Millions", "Thousands", "Ones"] if part == "a" else ["Milliards", "Millions", "Thousands", "Ones"]
        return body, activity("fields", "قسّم العدد لفترات، واكتب قيمة كل فترة.", [slot(i, label) for i, label in enumerate(labels)],
            {str(i): value.replace(",", "") for i, value in enumerate(values)}, numeric=True)

    if lesson == 7 and number in {1, 2, 3, 4, 5, 6, 7, 8, 16}:
        # Cards come from the question, not its answer; word and product forms
        # remain intact. Parse only recognized mathematical expressions.
        source = body
        while re.match(r"^(?:Arrange|Write|List|Use|You may use)\b", source):
            stripped = re.sub(r"^[^.]+\.\s*", "", source, count=1)
            if stripped == source:
                break
            source = stripped
        if number == 16:
            source = body.split(":", 1)[1].split("In a", 1)[0].strip()
        if "* " in source:
            labels = [s.strip() for s in source.split("* ") if s.strip()]
        elif ";" in source:
            labels = [s.strip().rstrip(".") for s in source.split(";")]
        elif "/" in source:
            labels = [s.strip() for s in source.split("/")]
        else:
            labels = re.findall(r"\d[\d,]*\d|\d", source)
        values = [number_value(s) for s in labels]
        if len(labels) >= 2 and all(v is not None for v in values):
            descending = "descending" in lower
            ordered = [label for _, label in sorted(zip(values, labels), key=lambda pair: pair[0], reverse=descending)]
            return body.split(".", 1)[0] + ".", ordered_cards(labels, ordered,
                "رتّب البطاقات من الأكبر للأصغر." if descending else "رتّب البطاقات من الأصغر للأكبر.")

    # Written names plus a numeric equivalent should accept number entry.
    if re.fullmatch(r"[A-Za-z -]+\s*\([\d,]+\)", clean):
        value = re.search(r"\(([\d,]+)\)", clean)[1].replace(",", "")
        return body, activity("fields", "اكتب قيمة العدد بالأرقام.", [slot("number", "Number")], {"number": value}, numeric=True)
    if lesson == 8 and number == 31:
        return body, activity("fields", "اكتب الارتفاع بعد التقريب بالمتر.", [slot("number", "Meters")], {"number": "2700"}, numeric=True)
    return body, None


def focused_explanation(data, answer, original, is_part):
    """Explain just this part, without revealing the rest of the worksheet."""
    if not data:
        return answer if is_part else original
    ui, rule = data["interaction"], data["math_rule"]
    kind = ui["kind"]
    if kind == "number_line":
        midpoint = (ui["lower"] + ui["upper"]) // 2
        relation = "below" if ui["value"] < midpoint else "at or above"
        return f"The midpoint is ({ui['lower']:,} + {ui['upper']:,}) ÷ 2 = {midpoint:,}.\n{ui['value']:,} is {relation} the midpoint, so it rounds to {int(rule['expected']['rounded']):,}."
    if kind == "mark_digits":
        digits = ui["number"].replace(",", "")
        return "Read the places from right to left, starting with Ones.\n" + "\n".join(
            f"{s['label']}: digit {digits[int(rule['expected'][s['id']])]}" for s in ui["slots"])
    if kind == "compare":
        return f"Compare from the greatest place. The first different digit decides.\n{ui['left']} {rule['expected']['sign']} {ui['right']}"
    if kind == "order":
        by_id = {token["id"]: token["label"] for token in ui["tokens"]}
        return "The completed arrangement is:\n" + " → ".join(by_id[rule["expected"][s["id"]]] for s in ui["slots"])
    if kind == "slots" and rule["kind"] == "exact":
        return "\n".join(f"{s['label']}: {rule['expected'][s['id']]}" for s in ui["slots"])
    if rule["kind"] in {"range", "difference", "missing_digit", "place_condition"}:
        return "There may be more than one valid answer.\n" + answer
    return answer if is_part else original
