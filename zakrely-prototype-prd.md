# Zakrely (ذاكريلي) — Prototype/MVP Technical Plan & PRD

**Scope of this version:** Junior 4 (Prep 1), Unit 1 — English, Math, Science. Web app.

---

## 1. Problem Statement

Egyptian students rely heavily on private lessons and "centers" for exam prep, with no consistent, affordable way to track understanding or get instant feedback. Parents have no visibility into where a child is actually strong or weak. Zakrely replaces/supplements this with an always-available, adaptive-feeling tutor that tracks progress the way a parent would ("ذاكريلي" = it studies with/for you).

## 2. Goals (Prototype)

1. Validate that a single unit, three-subject learning path with quizzing produces usable strength/weakness data per student.
2. Prove out the three subject-specific "hero features" are technically feasible with an LLM API (no RAG) at acceptable latency/cost.
3. Get a testable build in front of ~10–20 real Junior 4 students/parents to gauge engagement (do they finish Unit 1?).
4. Keep build time short enough for vibe-coding (Codex/Antigravity) to ship in days, not weeks.

## 3. Non-Goals (Prototype)

- **Full curriculum coverage** (multiple grades/units) — out of scope; content is hardcoded/seeded for Unit 1 only.
- **RAG / content retrieval pipeline** — deferred. For one unit, lesson content fits directly in the prompt context; RAG only earns its cost once content scales across grades. Revisit post-prototype.
- **Adaptive learning path (auto-resequencing lessons)** — too complex for v1. Path is fixed/linear (Lesson 1 → 2 → 3); only the *practice* recommendations react to weak areas.
- **Payments/subscriptions** — not needed to validate the core loop.
- **Native mobile app** — web only, per your call, for speed.
- **Voice-based English conversation** — text chat only for v1; voice adds real complexity (STT/TTS, latency) for uncertain payoff at this stage.

## 4. Users

- **Student (Junior 4)**: primary user, does lessons, quizzes, practice.
- **Parent** (nice-to-have in prototype, not P0): views progress summary.

## 5. Core Loop (applies to all 3 subjects)

1. Student opens a **Learning Path** (Duolingo-style node map) for the subject/unit.
2. Each node = a **Lesson**: short content + a quiz.
3. Every quiz question is tagged with a **skill type** (e.g., memorization, analytical thinking, application, comprehension).
4. After each quiz, the app shows a **strengths/weaknesses breakdown** by skill type.
5. **Practice mode** pulls questions weighted toward the student's weak skill types.
6. Subject-specific hero feature layers on top of this shared loop (see below).

## 6. Subject-Specific Hero Features

| Subject | Feature | Mechanism |
|---|---|---|
| English | Chatbot conversation practice | LLM-driven scripted-but-flexible dialogue tied to the unit's vocabulary/grammar target |
| Math | Upload-and-check | Student uploads a photo of handwritten work; model reads it and returns correct/incorrect (+ ideally where it went wrong) |
| Science | Concept explainer | Chat-style Q&A that re-explains a concept in simpler terms + memorization aids (e.g., quick-recall prompts) |

**Flag (Math feature — highest technical risk):** Full step-by-step handwriting verification (OCR + reasoning over messy handwriting) is a hard problem even for mature products. For the prototype, scope this down to: extract the **final answer** from the image reliably, check it against the expected answer, and only *attempt* step feedback as a stretch goal. Don't let this become the blocker for the whole prototype.

## 7. Requirements

### P0 (Must-Have for prototype to mean anything)
- [ ] Auth (simple — email/phone, no need for full account system)
- [ ] Learning path UI per subject showing Lesson 1..N (locked/unlocked state)
- [ ] Lesson content view (static content for Unit 1, per subject)
- [ ] Quiz engine: multiple-choice + short answer, each question tagged with skill type
- [ ] Skill-type scoring: per student, per subject, aggregate score by tag
- [ ] Strength/weakness view (simple bar/list, not fancy analytics)
- [ ] Practice mode: pulls N questions weighted by weakest tags
- [ ] English: text chatbot for a scripted conversation practice scenario
- [ ] Math: image upload + correct/incorrect check on final answer
- [ ] Science: chat-based concept re-explanation

### P1 (Fast follow, not blocking)
- [ ] Math: partial step feedback (where the mistake happened)
- [ ] Parent view (read-only progress summary)
- [ ] Basic gamification (streaks, XP, node-completion badges)
- [ ] Science: spaced-repetition style memorization prompts

### P2 (Explicitly deferred — design so it's not blocked later)
- [ ] RAG-backed content across full curriculum
- [ ] Adaptive path resequencing
- [ ] Voice conversation practice
- [ ] Multi-grade, multi-unit expansion

## 8. Question Tagging (skill type)

You'll need a source of truth for "this question is memorization vs analytical vs application." Two options:

- **Manual tagging** by whoever writes the questions (fast, reliable, recommended for prototype — you only need one unit's worth of questions).
- **LLM-assisted tagging** (have the model classify each question) — saves writing time but needs spot-checking; don't fully trust it un-reviewed for a scoring feature.

Recommendation: manual tag for prototype. Build the auto-tagger later once question volume makes manual tagging painful.

## 9. Tech Stack

- **Backend:** FastAPI
- **Frontend:** Next.js + Tailwind
- **AI:** Direct LLM API calls (OpenAI/Claude/etc.) — no RAG for v1, per above
- **DB:** Postgres (simple schema — see below) — pick whatever your ORM story is fastest with (Prisma if Next-heavy, SQLModel/SQLAlchemy if FastAPI-heavy)
- **Image handling (Math feature):** vision-capable LLM call on the uploaded image; store the image, not just the extracted text, for later debugging/QA

## 10. Minimal Data Model

- `User` (id, role: student/parent, name)
- `Subject` (English / Math / Science)
- `Lesson` (subject_id, order, content)
- `Question` (lesson_id, type, skill_tag, body, correct_answer)
- `Attempt` (user_id, question_id, answer, is_correct, timestamp)
- `SkillScore` (user_id, subject_id, skill_tag, score) — derived/aggregated from `Attempt`

## 11. Success Metrics (Prototype)

- **Leading:** % of test students who complete all Unit 1 lessons in each subject; average session count per student per week.
- **Leading:** Math upload-check accuracy rate (does it correctly judge right/wrong) — spot-check manually against a sample.
- **Lagging:** Do parents/students say they'd keep using it after Unit 1 is done? (qualitative, since this is a prototype, not a growth test).

## 12. Open Questions

- Who writes/reviews the actual Unit 1 content and tagged questions — you, a curriculum person, or generated-then-reviewed? *(content, blocking)*
- What's the actual accuracy tolerance for the Math checker before it's "good enough" to show a parent? *(product, blocking)*
- Is the English chatbot scenario scripted-per-lesson or fully open conversation? Open conversation is more impressive but harder to keep on-topic/useful. *(product, blocking)*
- Any budget ceiling on LLM API cost per student session? Affects whether you can afford full step-checking in Math or verbose chat turns. *(business, non-blocking for now but worth knowing before P1)*

## 13. Suggested Build Order

1. Learning path shell + lesson content view + auth (no AI yet) — get the skeleton real.
2. Quiz engine + skill tagging + strength/weakness view — this is the shared spine all 3 subjects sit on.
3. Practice mode (weak-tag-weighted question pulling).
4. Ship subjects one at a time, easiest-to-hardest: Science (concept chat) → English (scripted chatbot) → Math (upload-check, highest risk, needs the most iteration).

---

**One pushback before you run with this:** "24/7 private tutor" is the pitch, but the prototype as scoped is closer to "a smart quiz-and-practice app with three AI-flavored add-ons." That's fine and actually the right size for a prototype — just don't let the framing pull you into building adaptive-path or full-tutor features before you've validated that students finish Unit 1 at all.
