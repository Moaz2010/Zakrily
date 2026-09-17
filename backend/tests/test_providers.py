import pytest

from app.ai_service import providers
from scripts import generate_questions as gen


@pytest.fixture
def no_keys(monkeypatch):
    for key in ("anthropic_api_key", "openai_api_key", "groq_api_key"):
        monkeypatch.setattr(providers.settings, key, "")
    return monkeypatch


def test_configured_lists_only_providers_with_keys(no_keys):
    assert providers.configured() == []
    no_keys.setattr(providers.settings, "openai_api_key", "k")
    assert providers.configured() == ["openai"]


def test_configured_puts_the_default_provider_first(no_keys):
    no_keys.setattr(providers.settings, "openai_api_key", "k")
    no_keys.setattr(providers.settings, "groq_api_key", "k")
    no_keys.setattr(providers.settings, "chat_provider", "groq")
    assert providers.configured()[0] == "groq"


def test_resolve_falls_back_when_the_request_has_no_key(no_keys):
    no_keys.setattr(providers.settings, "openai_api_key", "k")
    assert providers.resolve("anthropic") == "openai"
    assert providers.resolve("openai") == "openai"
    assert providers.resolve(None) == "openai"


def test_resolve_returns_none_when_nothing_is_configured(no_keys):
    assert providers.resolve("openai") is None


def test_catalog_hides_models_whose_provider_has_no_key(no_keys):
    no_keys.setattr(providers.settings, "openai_api_key", "k")
    ids = {entry["id"] for entry in providers.catalog()}
    assert "gpt-4o-mini" in ids
    assert not any(entry["provider"] != "openai" for entry in providers.catalog())


def test_every_catalog_model_maps_back_to_its_provider():
    for entry in providers.CATALOG:
        assert providers.provider_of(entry["id"]) == entry["provider"]
        assert entry["cost"] in {"low", "high"}
    assert providers.provider_of("nope") is None


def test_parse_questions_tolerates_code_fences_and_prose():
    body = '[{"body": "Q?"}]'
    assert gen.parse_questions(body) == [{"body": "Q?"}]
    assert gen.parse_questions(f"```json\n{body}\n```") == [{"body": "Q?"}]
    assert gen.parse_questions(f"Here you go:\n{body}\nHope that helps") == [{"body": "Q?"}]
    with pytest.raises(ValueError):
        gen.parse_questions("no array here")


def test_validate_item_rejects_ungrounded_and_malformed_questions():
    allowed = {7}

    def item(**overrides):
        base = {"body": "What is a habitat?", "qtype": "mcq",
                "options": {"a": "A place", "b": "A rock"}, "correct_answer": "a",
                "explanation": "Stated in the source.", "source_id": 7}
        return {**base, **overrides}

    assert gen.validate_item(item(), allowed) is None
    assert "not a chunk" in gen.validate_item(item(source_id=99), allowed)
    assert "missing body" in gen.validate_item(item(body=""), allowed)
    assert "unknown qtype" in gen.validate_item(item(qtype="essay"), allowed)
    assert "not one of the options" in gen.validate_item(item(correct_answer="d"), allowed)
    assert "options object" in gen.validate_item(item(options=None), allowed)
    assert "not a number" in gen.validate_item(
        item(qtype="numeric", options=None, correct_answer="twelve"), allowed)


def test_validate_item_strips_options_repeated_in_the_stem():
    allowed = {7}
    entry = {"body": "Which is alive? a) Rock b) Cat c) Chair d) Cup", "qtype": "mcq",
             "options": {"a": "Rock", "b": "Cat", "c": "Chair", "d": "Cup"},
             "correct_answer": "b", "explanation": "Cats feed and grow.", "source_id": 7}
    assert gen.validate_item(entry, allowed) is None
    assert entry["body"] == "Which is alive?"


def test_fingerprint_matches_reworded_punctuation_only_differences():
    assert gen.fingerprint("What is a habitat?") == gen.fingerprint("what is a HABITAT")
    assert gen.fingerprint("What is a habitat?") != gen.fingerprint("What is an organism?")
