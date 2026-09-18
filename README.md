# Zakrily (ذاكريلي)

Prototype/MVP for Junior 4 (Prep 1), Unit 1 — English, Math, Science.

See [`zakrely-prototype-prd.md`](zakrely-prototype-prd.md) for the product spec and
[`zakrely-system-design.md`](zakrely-system-design.md) for the architecture, data model, API
contract, and task board.

## Stack

- **Frontend:** Next.js (App Router) + Tailwind — deployed on **Vercel**
- **Backend:** FastAPI — `ai_service/` module inline, no separate AI service
- **Database:** **Supabase** Postgres + pgvector (content embeddings)
- **Storage:** Supabase Storage (math submission photos)
- **AI:** Anthropic API (text + vision), no RAG retrieval service — grounding via direct context for Unit 1 scale

## Repo layout

```
zakrely/
├── backend/           # FastAPI app, Alembic migrations, offline CLI scripts
├── frontend/          # Next.js + Tailwind app
└── content/           # Raw Unit 1 source material per subject, for ingestion
```

## Getting started

### 1. Provision Supabase

1. Create a project at supabase.com.
2. In the SQL editor, enable pgvector: `create extension if not exists vector;`
3. Create a Storage bucket named `math-uploads` (or update `SUPABASE_STORAGE_BUCKET`).
4. Copy the project URL, service role key, and the Postgres connection string
   (Session Pooler URI, SQLAlchemy/psycopg2 form) into `backend/.env` (see `.env.example`).

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # Windows Git Bash; use .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # fill in Supabase + JWT + Anthropic values
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

Run tests: `pytest`

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The application calls the live backend and requires sign-in. Set
`NEXT_PUBLIC_API_URL` to the backend URL. Mock handlers are retained as development
fixtures but are no longer mounted by the application shell.

For local development without Supabase, set `DATABASE_URL=sqlite:///./zakrely.db`
in `backend/.env`, then run `alembic upgrade head` and `python -m scripts.seed`
from `backend/`. This creates a persistent local database, not mock data. Vector
search and Supabase Storage still require their production services. For a fresh
Supabase database, the initial Alembic migration creates the schema and vector
extension. Do not apply this baseline blindly to an existing manually created
schema; compare it with the migration before marking it as applied.

Deploy the frontend to Vercel by importing the repo and setting the root directory to
`frontend/`.

### Unit 1 curriculum

`frontend/lib/curriculum.json` is the shared catalog used by the frontend preview,
backend catalog routes, and `python -m scripts.seed`. It contains 3 English lessons,
8 Math lessons (including the paired titles and two concepts), and 5 Science lessons.
Backend deployments must include this file at its repository-relative location.

The seed can be rerun: it matches lessons by subject and order, updates names, and
preserves existing objectives, sections, and publication status. New lessons start
unpublished because only names have been supplied. The lesson page displays a
content-coming-soon message until sections are available. Catalog routes use actual
database IDs. Quiz and practice endpoints serve only approved questions belonging
to published lessons; empty question banks stay empty.

### Saved learner statistics

`GET /me/stats?timezone=Africa/Cairo` returns the authenticated student's streak,
seven-day activity, overall and subject accuracy, and lesson progress. The browser
sends its IANA timezone. Activity counts submitted quiz/practice answers by day and
subject. A streak includes consecutive active days ending today or yesterday and
resets after a missed full day. Opening a page or starting the timer does not count.

Accuracy is correct answers divided by all saved answers, including retakes;
unattempted subjects have `null` accuracy and display an em dash. Lesson scores
store the best quiz result on a 0–1 scale. Passing the configured threshold
(`QUIZ_PASS_THRESHOLD`, default 0.6) completes a lesson and unlocks the next one;
practice contributes to accuracy without unlocking lessons. Submissions are graded
server-side and saved transactionally. Text answers use normalized exact matching;
numeric answers use decimal comparison. No sample quiz results are saved.

Home, lesson pages, and profile share the same statistics. They refresh after
submissions, navigation, and window focus. Account names come from `/me`; unavailable
data shows loading/error/retry states. The invented exam reminder has been removed.

### 4. Lesson RAG chat (English, Math, Science)

```bash
cd backend
alembic upgrade head
python -m scripts.seed
python -m scripts.ingest --all
python -m scripts.import_science_questions
python -m scripts.import_english_questions
python -m scripts.import_math_questions
```

This ingests all 16 prepared Markdown sources under `content/<subject>/unit 1/`,
resolving actual database IDs by subject and lesson order (including English's
`lesson1_five_senses.md` naming). These are the supplied lesson transcriptions;
there are currently no PDF files in `content`. It publishes lesson sections and
indexes each lesson separately. To re-index one lesson, pass its source path to
`python -m scripts.ingest`. Reruns update source chunks in place.
The separate Science import publishes the 31 prepared
Science Lesson 1 exercises into the existing question bank without changing RAG data
or other lessons. The English import publishes the 33 skill-tagged Lesson 1 exercises
(32 scored items plus one unscored writing prompt). Both preserve question IDs and
attempts on reruns. Science question 14 is an
unscored reflection because the supplied source does not give a supported answer.
Short factual answers accept listed variants; longer explanations use choices based
on the source answer, avoiding unreliable exact-sentence grading. Both defensible
choices for source question 20 are accepted.

The Math import turns the eight supplied Unit 1 worksheets into 329 published
tasks (326 scored and 3 reflections), including 187 structured activities:
digit markers, place-value tiles, number/phrase ordering, comparison signs,
rounding number lines, and mathematical input fields. One question with missing
source underlines is held for review. All worksheet parts a–z are preserved.
The **أسئلة** tab, **اختبار**, and **تدريب ذكي** share saved answers and drafts.
Drag activities also support tap-to-place and keyboard activation. Structured
answers are graded on the backend; answer keys are excluded from public metadata.
Math lessons unlock sequentially beyond Lesson 2. Rerun the import after deploying
these changes to another database; it preserves question IDs and attempt history.
See [the interaction plan](docs/math-interactions.md) for the source mapping.

The lesson Questions tab and its quiz/practice links use the same authenticated
activity API. Each checked answer is saved immediately; returning resumes unanswered
questions. Drafts and explored Learn stops are saved per learner. The activity shows
latest-answer skill accuracy, flags small samples, and offers incorrect questions
from the currently weakest skills. Corrected questions leave that practice queue.
Historical attempts still feed the existing learner statistics. A completed question
set with a passing score updates the existing lesson progress and unlocks the next
lesson. The activity score can improve through targeted practice without restarting.

Chunks retain `subject`, `unit`, `lesson`, `content_type`, section, and question
number metadata. Explanations and exercises are separate; each exercise retains
its options, answer, and model answer. Worked problems are exercises. Retrieval
filters the lesson and content type before ranking; explicit question numbers
select that question only. The existing 1536-dimensional vector column stores
deterministic local lexical embeddings (word matching with lesson vocabulary
aliases for Arabic, not general semantic/multilingual embeddings). PostgreSQL
uses pgvector cosine distance; SQLite uses the same vectors locally.

Set `GROQ_API_KEY` in `backend/.env` for generated explanations;
`GROQ_MODEL` defaults to `openai/gpt-oss-120b`. Restart the backend after changing
environment settings. The shared `app/ai_service/chat.py` uses Groq's
[chat completions API](https://console.groq.com/docs/api-reference).

The Grade 4 Math practice chat also uses `GROQ_API_KEY`, but pins its question
generation and handwritten-photo feedback to `qwen/qwen3.8-27b`. Its image
requests use Groq's OpenAI-compatible `image_url` payload; the key stays on the
backend and is never sent to the browser.

Open the photo corrector from the Math lesson's **مصحح رياضي** card;
**تدريب ذكي** keeps the regular practice questions. The corrector retrieves
published Math Unit 1–2 content, excludes retired chunks, and re-embeds older
index versions in memory with the current model. Existing ingested content
therefore remains usable without changing lesson publication or stored vectors.

For voice/TTS support, create a Gemini API key in Google AI Studio, then add it to
`backend/.env` as `GEMINI_API_KEY`. You can optionally set `GEMINI_TTS_MODEL` and
`GEMINI_TTS_VOICE` as needed for the speech output. Example:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
GEMINI_TTS_VOICE=Aoede
```

Retrieved sources and the current lesson title are included in the grounding
prompt, which requires simple Egyptian Arabic explanations while preserving
English vocabulary and mathematical notation. Without a key or during provider failures, chat
clearly labels and shows retrieved excerpts instead. Empty retrieval returns a
helpful message without generating unsupported answers. Chat uses the existing
session/message tables and checks session ownership and lesson access.
The frontend's floating Nawwara icon opens a lesson-specific chat in both Learn
and Practice. It displays real API replies, loading and retry states, and resets
the conversation when switching lessons. `lesson_explain` is the shared API mode;
it maps to the existing stored `science_explain` enum for database compatibility.
Existing Science sessions continue to work. `english_convo` remains a separate
legacy practice mode. `ANTHROPIC_API_KEY` is still used by other existing AI features.

## API contract

The schemas in `backend/app/schemas/` are the source of truth. Run
`python -m scripts.export_api_types` from `backend/` after changing them. This
generates `frontend/lib/api/schema.ts` from FastAPI OpenAPI without a database
connection. `frontend/lib/api/types.ts` preserves the public names used by the UI.

## Status

Auth, catalog, quiz/practice grading, skill accuracy, and learner statistics use the
database. Tests cover account isolation, grading, best scores, unlocking, empty data,
invalid submissions, timezone streak boundaries, and registration/login. AI chat,
math-photo checking, and content ingestion/generation still include prototype work;
they do not contribute to the learner statistics described above.
