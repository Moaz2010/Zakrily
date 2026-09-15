from app.services.question_selection import tag_weight
from app.services.scoring import accuracy, has_sufficient_data, is_passing


def test_is_passing_threshold():
    assert is_passing(0.6) is True
    assert is_passing(0.59) is False


def test_accuracy_none_when_no_attempts():
    assert accuracy(0, 0) is None
    assert accuracy(3, 4) == 0.75


def test_sufficient_data_threshold():
    assert has_sufficient_data(2) is False
    assert has_sufficient_data(3) is True


def test_tag_weight_floors_at_point_one():
    assert tag_weight(1.0) == 0.1
    assert tag_weight(None) == 1.0
    assert tag_weight(0.5) == 0.5
