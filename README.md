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
cp .env.local.example .env.local   # or keep NEXT_PUBLIC_USE_MOCKS=true to run against MSW mocks
npm run dev
```

With `NEXT_PUBLIC_USE_MOCKS=true`, the frontend runs entirely against MSW mocks
(`src/lib/api/mocks/handlers.ts`) with zero backend dependency — this is the default
for local frontend-only work. Set it to `false` (and `NEXT_PUBLIC_API_BASE_URL` to the
real backend URL) to hit the live API.

Deploy the frontend to Vercel by importing the repo and setting the root directory to
`frontend/`.

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

The backend exports its OpenAPI schema (`backend/openapi.json`, gitignored — regenerate
with `python -c "import json; from app.main import app; json.dump(app.openapi(), open('openapi.json','w'))"`)
which the frontend's typed client (`frontend/src/lib/api/schema.d.ts`) is generated from via
`openapi-typescript`. The schema in `backend/app/schemas/` is the single source of truth —
changes there require re-running codegen on the frontend.

## Status

Phase 0 (contracts + scaffold) complete: schemas, stub routes with fixtures, DB models +
Alembic migration setup, Next.js app with typed client + MSW mocks, offline CLI script
skeletons for ingestion/generation/validation. See the task board in
`zakrely-system-design.md` §7 for what's next (Phase 1: real DB-backed auth, quiz grading,
skill scoring, practice selection).
