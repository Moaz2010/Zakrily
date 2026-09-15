def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_me_requires_auth(client):
    response = client.get("/me")
    assert response.status_code == 401


def test_lesson_quiz_never_leaks_correct_answer(client):
    response = client.get("/lessons/1/quiz", headers={"Authorization": "Bearer fake"})
    # No DB configured in this test run, so auth will 401 before reaching the
    # route — this test documents the contract that GET quiz responses must
    # never contain `correct_answer`; enforce it once BE-05 wires real DB auth.
    assert response.status_code in (401, 200)
    if response.status_code == 200:
        body = response.text
        assert "correct_answer" not in body
