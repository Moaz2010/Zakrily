"""Groq Whisper (STT) → lesson RAG conversation → Gemini TTS audio."""
import base64
import re

import httpx
from fastapi import HTTPException

from app.ai_service.retrieval import retrieve
from app.core.config import settings

BASE = "https://api.groq.com/openai/v1"
GREETING = "إزيك يا بطل! أنا نوّارة. هنتدرّب على الإنجليزي مع بعض من درسك، واحدة واحدة. جاهز؟"

# Give the model real headroom. Reasoning-style Groq models spend tokens on
# hidden reasoning before the visible answer starts, so a tight budget here
# is the #1 cause of replies getting cut off mid-sentence.
MAX_REPLY_TOKENS = 700
# If we still get truncated, retry once with a much bigger budget and a
# stricter "be brief" nudge instead of just failing the turn.
RETRY_REPLY_TOKENS = 1400


def post(path, **kwargs):
    if not settings.groq_api_key:
        raise HTTPException(503, "المحادثة الصوتية محتاجة إعداد GROQ_API_KEY على الخادم.")
    try:
        with httpx.Client(timeout=60) as client:
            response = client.post(BASE + path, headers={"Authorization": f"Bearer {settings.groq_api_key}"}, **kwargs)
            response.raise_for_status()
            return response
    except httpx.HTTPStatusError as exc:
        try:
            code = exc.response.json().get("error", {}).get("code")
        except ValueError:
            code = None
        if code == "model_terms_required":
            raise HTTPException(503, "الصوت محتاج تفعيل: مسؤول حساب Groq لازم يوافق على شروط موديلات Orpheus من Groq Console.") from exc
        raise HTTPException(502, "خدمة الصوت مش متاحة دلوقتي. جرّب تاني بعد شوية.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(502, "خدمة الصوت مش متاحة دلوقتي. جرّب تاني بعد شوية.") from exc


def transcribe(data, filename, content_type):
    # No forced `language`: the tutor is explicitly bilingual (student may
    # answer in Arabic or English), and pinning Whisper to "en" degrades
    # accuracy on Arabic speech instead of helping it. Let Whisper detect it.
    response = post(
        "/audio/transcriptions",
        files={"file": (filename, data, content_type)},
        data={"model": settings.groq_whisper_model, "response_format": "json"},
    )
    text = response.json().get("text", "").strip()
    if not text or len(text) > 4000:
        raise HTTPException(422, "مش سامعة كلام واضح. جرّب تسجيل قصير تاني.")
    return text


def _strip_markdown(answer: str) -> str:
    """Remove markdown formatting so TTS doesn't read out symbols.

    Uses DOTALL so bold/italic spans that wrap across a line break are still
    caught, and cleans up any lone/unmatched ** or _ left behind (e.g. from
    a reply that got cut off mid-span before this function ever runs).
    """
    answer = re.sub(r"\*{1,3}(.+?)\*{1,3}", r"\1", answer, flags=re.DOTALL)
    answer = re.sub(r"_{1,2}(.+?)_{1,2}", r"\1", answer, flags=re.DOTALL)
    answer = re.sub(r"^#+\s*", "", answer, flags=re.MULTILINE)
    answer = re.sub(r"^\s*[-•]\s+", "", answer, flags=re.MULTILINE)
    # Leftover stray markers (unmatched pairs, usually from truncation)
    answer = answer.replace("**", "").replace("__", "")
    return answer.strip()


def _call_model(system, history, text, max_tokens):
    result = post("/chat/completions", json={
        "model": settings.groq_model,
        "max_completion_tokens": max_tokens,
        "messages": [{"role": "system", "content": system}, *history[-10:], {"role": "user", "content": text}],
    }).json()
    choice = result["choices"][0]
    content = choice["message"]["content"].strip()
    finish_reason = choice.get("finish_reason")
    return content, finish_reason


def reply(lesson, history, text, db, first_turn=False):
    query = "\n".join([lesson.title, *[m["content"] for m in history[-4:]], text])
    chunks = retrieve(query, lesson_id=lesson.id, k=settings.retrieval_k, db=db)
    if not chunks:
        raise HTTPException(409, "محتوى الدرس لسه مش جاهز للمحادثة.")
    context = "\n\n".join(f"{c.source_ref}\n{c.text}" for c in chunks)
    if first_turn:
        task = (
            "This is the OPENING of the conversation. "
            "Greet the student warmly and briefly in Egyptian Arabic, then immediately ask ONE simple English question from the lesson to get them talking. "
            "No long intros. Just a quick friendly hello and your first question."
        )
    else:
        task = (
            "This is a MID-CONVERSATION turn. Do NOT greet or introduce yourself again. "
            "React directly to what the student just said, then ask ONE follow-up English question. "
            "If they got it right, celebrate warmly. If they made an English mistake, say the correct English version once and encourage them."
        )
    system = (
        "You are Nawwara, a kind and fun English tutor for an Egyptian Grade 4 student. "
        "You speak like a warm older sister — casual, encouraging, never stiff. "
        "Your job is to teach ENGLISH. You use simple Egyptian Arabic ONLY to briefly explain an English concept when the student is confused — never to correct their Arabic. "
        "If the student says something in Arabic, treat it as normal — just respond in English and keep the English practice going. "
        "Do NOT comment on, correct, or teach Arabic grammar. That is not your job.\n\n"
        "OUTPUT FORMAT — this is critical because your text is read aloud by a speech engine:\n"
        "Write plain spoken text only. No asterisks. No stars. No bold. No italic. No underscores. No markdown of any kind. "
        "Do not write ** or * or _ around any word, ever. Just write words normally.\n\n"
        "LENGTH — this is critical: keep your ENTIRE reply under 60 words. "
        "Never leave a sentence unfinished — always end on a complete thought.\n\n"
        "OTHER RULES:\n"
        "- NEVER greet or say your name after the first message.\n"
        "- One English correction per turn max. Keep it short and gentle.\n"
        "- Use ONLY the lesson sources below for topics and vocabulary. Do not invent content.\n\n"
        f"{task}\n\n"
        f"Lesson: {lesson.title}\n"
        f"Sources:\n{context}"
    )

    try:
        content, finish_reason = _call_model(system, history, text, MAX_REPLY_TOKENS)

        # If the model got cut off mid-sentence, retry once with a bigger
        # budget and an explicit "wrap it up" nudge, instead of shipping a
        # broken half-sentence (or a half-open **) to the student.
        if finish_reason == "length":
            retry_system = system + "\n\nIMPORTANT: Your previous attempt ran too long and got cut off. Be shorter and finish your sentence."
            content, finish_reason = _call_model(retry_system, history, text, RETRY_REPLY_TOKENS)

        answer = _strip_markdown(content)

        if not answer:
            raise ValueError("Empty reply")
        if finish_reason == "length":
            # Still truncated after retry: trim to the last complete sentence
            # rather than sending a dangling fragment to TTS.
            match = re.search(r"^(.*[.!?؟])[^.!?؟]*$", answer, flags=re.DOTALL)
            answer = match.group(1).strip() if match and match.group(1).strip() else answer
        if len(answer) > 1200:
            raise ValueError("Invalid reply")

        return answer
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(502, "تعذّر تجهيز الرد. جرّب تاني.") from exc


def synthesize(text):
    """Convert text to speech using Gemini TTS (handles Arabic + English in one call)."""
    if not settings.gemini_api_key:
        raise HTTPException(503, "المحادثة الصوتية محتاجة إعداد GEMINI_API_KEY على الخادم.")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_tts_model}:generateContent?key={settings.gemini_api_key}"
    )
    body = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": settings.gemini_tts_voice}
                }
            },
        },
    }
    try:
        with httpx.Client(timeout=60) as client:
            response = client.post(url, json=body)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(502, "خدمة الصوت مش متاحة دلوقتي. جرّب تاني بعد شوية.") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(502, "خدمة الصوت مش متاحة دلوقتي. جرّب تاني بعد شوية.") from exc

    # Gemini returns raw 16-bit PCM at 24 kHz; wrap it in a WAV header so the browser can play it
    try:
        b64 = response.json()["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
        pcm = base64.b64decode(b64)
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(502, "تعذّر استخراج الصوت من الرد. جرّب تاني.") from exc

    wav = _pcm_to_wav(pcm, sample_rate=24000, channels=1, sample_width=2)
    return [base64.b64encode(wav).decode("ascii")]


def _pcm_to_wav(pcm: bytes, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2) -> bytes:
    """Wrap raw PCM bytes in a RIFF/WAV header."""
    import struct
    data_size = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_size,   # ChunkSize
        b"WAVE",
        b"fmt ",
        16,               # SubChunk1Size (PCM)
        1,                # AudioFormat (1 = PCM)
        channels,
        sample_rate,
        sample_rate * channels * sample_width,  # ByteRate
        channels * sample_width,                # BlockAlign
        sample_width * 8,                       # BitsPerSample
        b"data",
        data_size,
    )
    return header + pcm