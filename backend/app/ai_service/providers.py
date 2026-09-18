"""One chat-completion interface over Anthropic, OpenAI and Groq.

Callers pass a provider name and get plain text back. Anthropic takes the
system prompt as a top-level field rather than a message, which is the only
shape difference that leaks into this module.
"""
import json

import httpx

from app.core.config import settings

ANTHROPIC = "anthropic"
OPENAI = "openai"
GROQ = "groq"
PROVIDERS = (ANTHROPIC, OPENAI, GROQ)

# Models offered in the UI picker. `cost` is a coarse band for the label, so a
# tester can see what a comparison run will actually cost before they trigger it.
# usd_per_mtok is (input, output) at the time of writing — labels, not billing.
CATALOG = [
    {"id": "claude-haiku-4-5-20251001", "provider": ANTHROPIC, "label": "Claude Haiku 4.5",
     "cost": "low", "usd_per_mtok": (1.0, 5.0)},
    {"id": "claude-sonnet-4-6", "provider": ANTHROPIC, "label": "Claude Sonnet 4.6",
     "cost": "high", "usd_per_mtok": (3.0, 15.0)},
    {"id": "gpt-4o-mini", "provider": OPENAI, "label": "GPT-4o mini",
     "cost": "low", "usd_per_mtok": (0.15, 0.6)},
    {"id": "gpt-4o", "provider": OPENAI, "label": "GPT-4o",
     "cost": "high", "usd_per_mtok": (2.5, 10.0)},
    {"id": "openai/gpt-oss-120b", "provider": GROQ, "label": "GPT-OSS 120B (Groq)",
     "cost": "low", "usd_per_mtok": (0.15, 0.75)},
]


def catalog(available: list[str] | None = None) -> list[dict]:
    """Catalog entries whose provider has a key configured."""
    usable = set(available if available is not None else configured())
    return [entry for entry in CATALOG if entry["provider"] in usable]


def provider_of(model_id: str) -> str | None:
    return next((entry["provider"] for entry in CATALOG if entry["id"] == model_id), None)


class ProviderError(RuntimeError):
    """The provider was unreachable, refused the request, or returned no text."""


def configured() -> list[str]:
    """Providers that currently have an API key, in preference order."""
    keys = {ANTHROPIC: settings.anthropic_api_key,
            OPENAI: settings.openai_api_key,
            GROQ: settings.groq_api_key}
    preferred = [settings.chat_provider] if settings.chat_provider in PROVIDERS else []
    order = preferred + [name for name in PROVIDERS if name not in preferred]
    return [name for name in order if keys.get(name)]


def resolve(requested: str | None) -> str | None:
    """Pick the provider to use: the requested one if it has a key, else the first configured."""
    available = configured()
    if requested in available:
        return requested
    return available[0] if available else None


def model_for(provider: str) -> str:
    return {ANTHROPIC: settings.anthropic_model,
            OPENAI: settings.openai_model,
            GROQ: settings.groq_model}[provider]


def _request(provider: str, system: str, messages: list[dict], max_tokens: int,
             model: str | None, stream: bool, reasoning_effort: str | None = None):
    """Build the (url, headers, payload) for one chat call."""
    if provider == ANTHROPIC:
        url = "https://api.anthropic.com/v1/messages"
        headers = {"x-api-key": settings.anthropic_api_key,
                   "anthropic-version": "2023-06-01",
                   "content-type": "application/json"}
        payload = {"model": model or settings.anthropic_model, "max_tokens": max_tokens,
                   "system": system, "messages": messages}
    elif provider in (OPENAI, GROQ):
        openai_flavoured = provider == OPENAI
        url = ("https://api.openai.com/v1/chat/completions" if openai_flavoured
               else "https://api.groq.com/openai/v1/chat/completions")
        key = settings.openai_api_key if openai_flavoured else settings.groq_api_key
        headers = {"Authorization": f"Bearer {key}"}
        payload = {"model": model or model_for(provider),
                   "messages": [{"role": "system", "content": system}, *messages]}
        # Groq's reasoning models bill hidden reasoning against the completion
        # budget, so they use a different field and need the headroom.
        if openai_flavoured:
            payload["max_tokens"] = max_tokens
        else:
            payload["max_completion_tokens"] = max_tokens
            payload["reasoning_effort"] = reasoning_effort or "low"
    else:
        raise ProviderError(f"Unknown provider {provider!r}")
    if stream:
        payload["stream"] = True
    return url, headers, payload


def _text_from_event(provider: str, data: dict) -> str:
    """Pull the incremental text out of one streamed event."""
    if provider == ANTHROPIC:
        if data.get("type") == "content_block_delta":
            return data.get("delta", {}).get("text", "") or ""
        return ""
    choices = data.get("choices") or []
    if not choices:
        return ""
    return choices[0].get("delta", {}).get("content") or ""


def stream(provider: str, system: str, messages: list[dict], *, max_tokens: int = 2400,
           timeout: float = 90.0, model: str | None = None):
    """Yield the reply in chunks as the model produces it.

    Both API families use server-sent events, differing only in the event shape,
    which `_text_from_event` absorbs.
    """
    url, headers, payload = _request(provider, system, messages, max_tokens, model, stream=True)
    try:
        with httpx.Client(timeout=timeout) as client:
            with client.stream("POST", url, headers=headers, json=payload) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    blob = line[5:].strip()
                    if not blob or blob == "[DONE]":
                        continue
                    try:
                        piece = _text_from_event(provider, json.loads(blob))
                    except ValueError:
                        continue
                    if piece:
                        yield piece
    except httpx.HTTPError as exc:
        raise ProviderError(str(exc)) from exc


def complete(provider: str, system: str, messages: list[dict], *, max_tokens: int = 2400,
             timeout: float = 45.0, model: str | None = None,
             reasoning_effort: str | None = None) -> str:
    """Send a chat completion and return the assistant's text.

    `messages` is the OpenAI-style history (user/assistant turns only); the
    system prompt is passed separately because Anthropic requires it that way.
    `model` overrides the provider's configured default.
    """
    url, headers, payload = _request(provider, system, messages, max_tokens, model,
                                     stream=False, reasoning_effort=reasoning_effort)
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            body = response.json()
    except httpx.HTTPError as exc:
        raise ProviderError(str(exc)) from exc
    except ValueError as exc:
        raise ProviderError("Provider returned invalid JSON") from exc

    try:
        if provider == ANTHROPIC:
            text = "".join(block.get("text", "") for block in body["content"]
                           if block.get("type") == "text")
        else:
            text = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ProviderError("Provider returned an unexpected response shape") from exc

    if not isinstance(text, str) or not text.strip():
        raise ProviderError("Provider returned empty text")
    return text.strip()
