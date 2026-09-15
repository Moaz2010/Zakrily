/**
 * MSW handlers — all 15 endpoints, using REAL lesson names from AI-01 seed.
 * Arabic fixture strings so RTL layout renders authentically in dev.
 */
import { http, HttpResponse } from "msw";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURE_USER = { id: 1, name: "سلمى مدحت", email: "salma@example.com", role: "student" };
const FIXTURE_TOKEN = { token: "mock-jwt-token", user: FIXTURE_USER };

const FIXTURE_SUBJECTS = [
  { id: 1, slug: "english", name_ar: "اللغة الإنجليزية", name_en: "English" },
  { id: 2, slug: "math",    name_ar: "الرياضيات",        name_en: "Math"    },
  { id: 3, slug: "science", name_ar: "العلوم",           name_en: "Science" },
];

// Real lesson names from seed.py (AI-01)
const PATH_BY_SUBJECT: Record<string, Array<{ lesson_id: number; order: number; title: string; status: string; score: number | null }>> = {
  english: [
    { lesson_id: 1, order: 1, title: "ما هي الحواس الخمس؟",           status: "completed", score: 90 },
    { lesson_id: 2, order: 2, title: "العادات الصحية",                 status: "unlocked",  score: null },
    { lesson_id: 3, order: 3, title: "وقت القصة – وجبة جحا الرائعة",  status: "locked",    score: null },
  ],
  math: [
    { lesson_id: 4,  order: 1, title: "الأعداد الكبيرة! القيم المتغيرة (1)", status: "completed", score: 80 },
    { lesson_id: 5,  order: 2, title: "الأعداد الكبيرة! القيم المتغيرة (2)", status: "completed", score: 75 },
    { lesson_id: 6,  order: 3, title: "أشكال متعددة لكتابة الأعداد (1)",     status: "unlocked",  score: null },
    { lesson_id: 7,  order: 4, title: "أشكال متعددة لكتابة الأعداد (2)",     status: "locked",    score: null },
    { lesson_id: 8,  order: 5, title: "مقارنة الأعداد الكبيرة (1)",          status: "locked",    score: null },
    { lesson_id: 9,  order: 6, title: "مقارنة الأعداد الكبيرة (2)",          status: "locked",    score: null },
    { lesson_id: 10, order: 7, title: "الأعداد تنازلياً وتصاعدياً",           status: "locked",    score: null },
    { lesson_id: 11, order: 8, title: "قواعد التقريب",                        status: "locked",    score: null },
  ],
  science: [
    { lesson_id: 12, order: 1, title: "لنبحث عن الكائنات الحية",              status: "completed", score: 87 },
    { lesson_id: 13, order: 2, title: "كيف نلاحظ؟",                           status: "completed", score: 70 },
    { lesson_id: 14, order: 3, title: "ألوان وأشكال الكائنات الحية",          status: "unlocked",  score: null },
    { lesson_id: 15, order: 4, title: "أماكن مختلفة، كائنات مختلفة",         status: "locked",    score: null },
    { lesson_id: 16, order: 5, title: "كائنات الصحراء الحية",                 status: "locked",    score: null },
  ],
};

const FIXTURE_LESSON = (id: string) => ({
  id: Number(id),
  title: "ما هي الحواس الخمس؟",
  objective: "What are the Five Senses?",
  is_published: true,
  sections: [
    { id: 1, order_index: 1, heading: "مقدمة", body_md: "## مقدمة\n\nالحواس الخمس هي..." },
    { id: 2, order_index: 2, heading: "الحواس الخمس", body_md: "## الحواس الخمس\n\n1. البصر\n2. السمع..." },
  ],
});

const FIXTURE_QUESTIONS = [
  { id: 1, qtype: "mcq",          body: "كم عدد الحواس؟",             options: ["3", "4", "5", "6"], skill_tag: "memorization"  },
  { id: 2, qtype: "short_answer", body: "ما هي حاسة الشم؟",           options: null,                  skill_tag: "comprehension" },
  { id: 3, qtype: "mcq",          body: "أي حاسة نستخدم للسمع؟",      options: ["العين", "الأذن", "الأنف", "اللسان"], skill_tag: "application" },
];

const FIXTURE_QUIZ_SUBMIT = {
  score: 66.7,
  results: [
    { question_id: 1, is_correct: true,  correct_answer: "5",    explanation: "الحواس الخمس هي البصر والسمع والشم والتذوق واللمس." },
    { question_id: 2, is_correct: true,  correct_answer: "الأنف", explanation: null },
    { question_id: 3, is_correct: false, correct_answer: "الأذن", explanation: "نسمع بالأذن." },
  ],
  skill_breakdown: [
    { skill_tag: "memorization",  correct: 1, total: 1, accuracy: 1.0 },
    { skill_tag: "comprehension", correct: 1, total: 1, accuracy: 1.0 },
    { skill_tag: "application",   correct: 0, total: 1, accuracy: 0.0 },
  ],
  unlocked_next: true,
};

const FIXTURE_SKILLS = [
  { skill_tag: "memorization",  label_ar: "الحفظ",   correct: 5, total: 6, accuracy: 0.83, insufficient_data: false },
  { skill_tag: "comprehension", label_ar: "الفهم",   correct: 3, total: 4, accuracy: 0.75, insufficient_data: false },
  { skill_tag: "application",   label_ar: "التطبيق", correct: 1, total: 2, accuracy: 0.50, insufficient_data: true  },
  { skill_tag: "analysis",      label_ar: "التحليل", correct: 0, total: 0, accuracy: 0.00, insufficient_data: true  },
];

// ── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/register`, () => HttpResponse.json(FIXTURE_TOKEN, { status: 201 })),
  http.post(`${BASE}/auth/login`,    () => HttpResponse.json(FIXTURE_TOKEN)),
  http.get(`${BASE}/me`,             () => HttpResponse.json(FIXTURE_USER)),

  // Subjects
  http.get(`${BASE}/subjects`, () => HttpResponse.json(FIXTURE_SUBJECTS)),
  http.get(`${BASE}/subjects/:slug/path`, ({ params }) => {
    const path = PATH_BY_SUBJECT[params.slug as string] ?? PATH_BY_SUBJECT.science;
    return HttpResponse.json(path);
  }),

  // Lessons
  http.get(`${BASE}/lessons/:id`,       ({ params }) => HttpResponse.json(FIXTURE_LESSON(params.id as string))),
  http.get(`${BASE}/lessons/:id/quiz`,  ()            => HttpResponse.json({ questions: FIXTURE_QUESTIONS })),
  http.post(`${BASE}/lessons/:id/quiz/submit`, ()     => HttpResponse.json(FIXTURE_QUIZ_SUBMIT)),

  // Skills
  http.get(`${BASE}/me/skills`, () => HttpResponse.json(FIXTURE_SKILLS)),

  // Practice
  http.get(`${BASE}/practice/next`,   () => HttpResponse.json({ questions: FIXTURE_QUESTIONS })),
  http.post(`${BASE}/practice/submit`,() => HttpResponse.json({
    results: [{ question_id: 1, is_correct: true, correct_answer: "5" }],
    skill_breakdown: [{ skill_tag: "memorization", correct: 1, total: 1, accuracy: 1.0 }],
  })),

  // Chat
  http.post(`${BASE}/chat/sessions`, () => HttpResponse.json({ session_id: 42 }, { status: 201 })),
  http.post(`${BASE}/chat/sessions/:id/message`, () => HttpResponse.json({
    reply: "هذا رد نموذجي من المساعد الذكي.",
    done: false,
    feedback: null,
  })),

  // Math
  http.post(`${BASE}/math/submit`, () => HttpResponse.json({
    verdict: "correct",
    feedback: "ممتاز! إجابتك صحيحة.",
    extracted: { final_answer: "5", steps: ["عدّ الأصابع: 5"] },
  })),
];
