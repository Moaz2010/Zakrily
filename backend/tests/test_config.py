from pathlib import Path

from app.core.config import Settings


def test_env_path_is_backend_relative_not_launch_directory(monkeypatch):
    expected = Path(__file__).resolve().parents[1] / ".env"
    monkeypatch.chdir(expected.parent.parent)
    assert Settings.model_config["env_file"] == expected
    assert Settings.model_config["env_file"].is_absolute()
