from app.ai_service.embeddings import arabic_root, normalize_arabic, tokens
from app.models.question import QuestionType
from scripts.import_math_questions import classify

OPTIONS = "* A. 3\n* B. 2\n* C. 5\n* D. 1"


def test_listed_options_become_multiple_choice():
    qtype, options, correct, scored, _ = classify("C. 5", OPTIONS)
    assert qtype == QuestionType.mcq
    assert options == {"A": "3", "B": "2", "C": "5", "D": "1"}
    assert correct == "C" and scored is True


def test_options_present_but_answer_names_none_is_not_guessed():
    """Marking an arbitrary key correct would score real students wrongly."""
    qtype, options, _, scored, _ = classify("Some prose answer that names no option.", OPTIONS)
    assert qtype != QuestionType.mcq or options is None
    assert scored is False


def test_plain_number_becomes_numeric_and_accepts_thousands_separators():
    qtype, _, correct, scored, accepted = classify("80,000", None)
    assert qtype == QuestionType.numeric and scored is True
    assert correct == "80000"
    assert "80,000" in accepted


def test_multipart_answers_are_saved_unscored():
    """"a. 80 b. 50,000" cannot be graded fairly as one free-text answer."""
    _, _, _, scored, _ = classify("a. 80 b. 50,000", None)
    assert scored is False


def test_undeterminable_source_answer_is_unscored():
    _, _, _, scored, _ = classify(
        "[Answer cannot be determined confidently from the provided material]", None)
    assert scored is False


def test_short_phrase_is_scored_with_variants():
    qtype, _, correct, scored, accepted = classify("Ten Thousands.", None)
    assert qtype == QuestionType.short_answer and scored is True
    assert correct == "Ten Thousands."
    assert "Ten Thousands" in accepted


def test_long_prose_answers_are_unscored():
    long_answer = ("Split the number into periods of three digits starting from the right, "
                   "then read each period and name it, which gives the full spoken form.")
    _, _, _, scored, _ = classify(long_answer, None)
    assert scored is False


def test_arabic_normalization_folds_spelling_variants():
    assert normalize_arabic("الأشياء") == normalize_arabic("الاشياء")
    assert normalize_arabic("البيئة") == normalize_arabic("البيئه")


def test_arabic_root_strips_attached_prefixes():
    assert arabic_root("والنباتات") == arabic_root("النباتات") == arabic_root("نباتات")


def test_arabic_root_keeps_short_stems_intact():
    """Over-stripping turned الكائن into كا and broke every match for it."""
    assert arabic_root("الكائن") == "كائن"


def test_arabic_queries_reach_the_english_lesson_vocabulary():
    for query in ("الكائنات الحية", "كائن حي", "الكائن الحي"):
        assert "living" in tokens(query), query
    assert "habitat" in tokens("ما هو الموطن")
    assert "place" in tokens("القيمة المكانية")


def test_arabic_question_words_are_dropped():
    """Otherwise two unrelated questions match on ما/هو alone."""
    assert tokens("ما هو") == []
