# Zakrely (ذاكريلي)

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

### 4. Content ingestion (offline, once real Unit 1 content is available)

```bash
cd backend
python -m scripts.ingest content/english/unit1/lesson1.md --subject-id 1 --lesson-id 1
python -m scripts.generate_questions --lesson-id 1
python -m scripts.validate_content --lesson-id 1
# Then human-review surviving pending questions via the FE-09 review page
# before they can be served (review_status must be 'approved').
```

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
