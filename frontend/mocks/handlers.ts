/**
 * MSW handlers — all 15 endpoints, using REAL lesson names from AI-01 seed.
 * Arabic fixture strings so RTL layout renders authentically in dev.
 */
import { http, HttpResponse } from "msw";
import { curriculumSubjects, getSubject, getCurriculumLesson, initialPath } from "@/lib/curriculum";

const BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FIXTURE_USER = { id: 1, name: "سلمى مدحت", email: "salma@example.com", role: "student" };
const FIXTURE_TOKEN = { token: "mock-jwt-token", user: FIXTURE_USER };

const FIXTURE_SUBJECTS = curriculumSubjects;

const FIXTURE_LESSON = (id: string) => {
  const item = getCurriculumLesson(Number(id));
  if (!item) return null;
  return {
    lesson: {
      id: item.id,
      subject_id: item.subject.id,
      order_index: item.order,
      title: item.title,
      objective: "",
    },
    sections: [],
  };
};

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
    const slug = params.slug as string;
    if (!getSubject(slug)) return HttpResponse.json({ detail: "Subject not found" }, { status: 404 });
    return HttpResponse.json(initialPath(slug));
  }),

  // Lessons
  http.get(`${BASE}/lessons/:id`, ({ params }) => {
    const lesson = FIXTURE_LESSON(params.id as string);
    return lesson ? HttpResponse.json(lesson) : HttpResponse.json({ detail: "Lesson not found" }, { status: 404 });
  }),
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
