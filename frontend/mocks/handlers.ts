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

const FIXTURE_LESSON_1_SECTIONS = [
  {
    id: 101,
    order_index: 1,
    heading: "1. Lesson Overview",
    body_md: "Lesson 1, 'Finding Living Organisms', introduces students to living organisms vs non-living things, their 3 main needs (feeding, growth, breathing), and their habitats."
  },
  {
    id: 102,
    order_index: 2,
    heading: "2. Learning Objectives",
    body_md: "* Identify living organisms and non-living things.\n* List the 3 characteristics of living organisms.\n* Understand what a habitat is."
  },
  {
    id: 103,
    order_index: 3,
    heading: "3. Lesson Content",
    body_md: "### Living Organisms vs Non-Living Things\nLiving organisms feed, grow, and breathe. Examples: humans, sparrows, frogs, trees, cacti.\nNon-living things do not feed, grow, or breathe. Examples: air, water, rocks, stones, sun.\n\n### Definition — Habitat\nThe place where a living organism lives and finds food, water, and shelter.\n\n### 3 Discovery Steps\n1. Guess: Predict where the organism lives.\n2. Search: Go out and search quietly.\n3. Record: Write down the name and location."
  },
  {
    id: 104,
    order_index: 4,
    heading: "4. Key Vocabulary",
    body_md: "### Living organisms\nEverything that can feed, grow, and breathe.\n\n### Non-living things\nThings around us that do not feed, grow, or breathe.\n\n### Habitat\nThe place where a living organism lives."
  }
];

const FIXTURE_LESSON_2_SECTIONS = [
  {
    id: 1,
    order_index: 1,
    heading: "1. Lesson Overview",
    body_md: "Lesson 2, 'How to Observe,' teaches students how to carefully observe living organisms and record what they observe.\n\nMain scientific concepts covered: observation, magnifying glass technique, and scientific recording cards."
  },
  {
    id: 2,
    order_index: 2,
    heading: "2. Learning Objectives",
    body_md: "* Use a magnifying glass to observe details of some living organisms.\n* Correctly prepare a record card for some living organisms.\n* Identify rules for observation: Shape, Color, and Size."
  },
  {
    id: 3,
    order_index: 3,
    heading: "3. Lesson Content",
    body_md: "### Rules for Observation\nWhen looking closely at living organisms, observe three features: Shape, Color, and Size.\n\n### Definition — Magnifying Glass\nA tool used to help see details of some living organisms (such as insects and plants).\n\n### Definition — Record Card\nA written and sketched record of an observation of a living organism, including topic, date, grade, name, sketch, and descriptive sentences.\n\n### How to Use a Magnifying Glass\n1. Movable object (like a leaf): Hold magnifying glass close to your eye, move object back and forth.\n2. Unmovable object (like a tree trunk): Hold magnifying glass close to your eye, move your face and glass together back and forth.\n\n### Safety Precautions\n* Never look directly at the Sun with a magnifying glass.\n* Wear gloves while observing living organisms to protect hands from pollution."
  },
  {
    id: 4,
    order_index: 4,
    heading: "4. Key Vocabulary",
    body_md: "### Magnifying glass\nA tool used to see details of living organisms.\n\n### Record card\nA written and sketched record of an observation."
  }
];

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
    sections: Number(id) === 13 ? FIXTURE_LESSON_2_SECTIONS : Number(id) === 12 ? FIXTURE_LESSON_1_SECTIONS : FIXTURE_LESSON_2_SECTIONS,
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

const FIXTURE_LESSON_2_ACTIVITY_QUESTIONS = [
  {
    id: 101,
    number: 1,
    body: "A ____________ is used to observe some living organisms closely.",
    options: { "A": "Magnifying glass", "B": "Microscope", "C": "Telescope", "D": "Ruler" },
    skill_tag: "memorization",
    previous_attempt_id: null,
  },
  {
    id: 102,
    number: 2,
    body: "When looking at a tree trunk using a magnifying glass, move your ____________ and ____________ back and front until you get a clear image.",
    options: { "A": "Face and magnifying glass", "B": "Hands and feet", "C": "Tree trunk and eyes", "D": "Glass only" },
    skill_tag: "memorization",
    previous_attempt_id: null,
  },
  {
    id: 103,
    number: 3,
    body: "When observing a living organism closely, you can record your observations on a ____________.",
    options: { "A": "Record card", "B": "Story book", "C": "Drawing canvas", "D": "Notebook cover" },
    skill_tag: "memorization",
    previous_attempt_id: null,
  },
  {
    id: 104,
    number: 4,
    body: "When preparing a record card, write the ____________ first.",
    options: { "A": "Topic", "B": "Date", "C": "Name", "D": "Sketch" },
    skill_tag: "memorization",
    previous_attempt_id: null,
  },
  {
    id: 105,
    number: 5,
    body: "When observing a living organism closely, we must observe three features: ____________, ____________, and ____________.",
    options: { "A": "Shape, Color, Size", "B": "Weight, Age, Speed", "C": "Food, Water, Air", "D": "Name, Grade, Date" },
    skill_tag: "comprehension",
    previous_attempt_id: null,
  },
  {
    id: 106,
    number: 6,
    body: "A record card sketch should use thin, clear lines with ____________.",
    options: { "A": "No shading", "B": "Heavy dark shadows", "C": "Colored crayons only", "D": "Imagined parts" },
    skill_tag: "memorization",
    previous_attempt_id: null,
  },
  {
    id: 107,
    number: 7,
    body: "Never look directly at the ____________ through a magnifying glass because it harms your eyes.",
    options: { "A": "Sun", "B": "Moon", "C": "Leaf", "D": "Tree" },
    skill_tag: "comprehension",
    previous_attempt_id: null,
  },
  {
    id: 108,
    number: 8,
    body: "The dung beetle rolls a ball of dung ____________ while standing on its head.",
    options: { "A": "Backward", "B": "Forward", "C": "Sideways", "D": "Upward" },
    skill_tag: "analysis",
    previous_attempt_id: null,
  },
];

const FIXTURE_LESSON_1_ACTIVITY_QUESTIONS = [
  {
    id: 1,
    number: 1,
    body: "Living organisms can feed, grow, and ____________.",
    options: { "A": "breathe", "B": "sleep", "C": "fly", "D": "run" },
    skill_tag: "memorization",
    previous_attempt_id: null,
  },
  {
    id: 2,
    number: 2,
    body: "The place where a living organism lives is called its ____________.",
    options: { "A": "Habitat", "B": "School", "C": "Garden", "D": "Store" },
    skill_tag: "memorization",
    previous_attempt_id: null,
  },
  {
    id: 3,
    number: 3,
    body: "Which of the following is a non-living thing?",
    options: { "A": "Rock", "B": "Sparrow", "C": "Tree", "D": "Frog" },
    skill_tag: "comprehension",
    previous_attempt_id: null,
  },
  {
    id: 4,
    number: 4,
    body: "What is the first step of discovery?",
    options: { "A": "Guess", "B": "Search", "C": "Record", "D": "Sleep" },
    skill_tag: "memorization",
    previous_attempt_id: null,
  },
  {
    id: 20,
    number: 20,
    body: "Ants live under stones or underground in cool places to avoid high heat. Which option describes their habitat?",
    options: { "A": "Cool places under rocks or big stones", "B": "On top of tree branches", "C": "In open hot sunny desert sand", "D": "In deep river water" },
    skill_tag: "comprehension",
    previous_attempt_id: null,
  },
  {
    id: 29,
    number: 29,
    body: "Look at the exploration pictures: Picture 1 (thinking boy), Picture 2 (girl with magnifying glass), Picture 3 (boy writing card). What is the correct order of steps?",
    options: { "A": "1. Guess -> 2. Search -> 3. Record", "B": "1. Search -> 2. Record -> 3. Guess", "C": "1. Record -> 2. Guess -> 3. Search", "D": "1. Search -> 2. Guess -> 3. Record" },
    skill_tag: "analysis",
    previous_attempt_id: null,
  }
];

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

  // Activity
  http.get(`${BASE}/lessons/:id/activity`, ({ params }) => {
    const id = Number(params.id);
    const questions = id === 13 ? FIXTURE_LESSON_2_ACTIVITY_QUESTIONS : FIXTURE_LESSON_1_ACTIVITY_QUESTIONS;
    return HttpResponse.json({
      total: questions.length,
      answered: 0,
      score: 1.0,
      learned_steps: [],
      questions: questions,
      drafts: {},
    });
  }),
  http.post(`${BASE}/lessons/:id/activity/answer`, async ({ request, params }) => {
    const id = Number(params.id);
    const questions = id === 13 ? FIXTURE_LESSON_2_ACTIVITY_QUESTIONS : FIXTURE_LESSON_1_ACTIVITY_QUESTIONS;
    const body = (await request.json()) as { question_id: number; answer: string };
    const q = questions.find((item) => item.id === body.question_id);
    const isCorrect = body.answer === "A" || body.answer.toLowerCase().includes("magnifying") || body.answer.toLowerCase().includes("face") || body.answer.toLowerCase().includes("record") || body.answer.toLowerCase().includes("topic") || body.answer.toLowerCase().includes("shape") || body.answer.toLowerCase().includes("sun") || body.answer.toLowerCase().includes("backward") || body.answer.toLowerCase().includes("breathe") || body.answer.toLowerCase().includes("habitat") || body.answer.toLowerCase().includes("rock") || body.answer.toLowerCase().includes("guess") || body.answer.toLowerCase().includes("cool");
    return HttpResponse.json({
      total: questions.length,
      answered: 1,
      score: 1.0,
      learned_steps: [],
      questions: questions.slice(1),
      drafts: {},
      feedback: {
        is_correct: isCorrect,
        given_answer: body.answer,
        correct_answer: q?.options?.A ?? "A",
        explanation: "Great job! Your answer matches the lesson content.",
      },
    });
  }),
  http.put(`${BASE}/lessons/:id/activity/progress`, async ({ request }) => {
    const body = (await request.json()) as { learned_steps?: number[] };
    return HttpResponse.json({ total: 5, answered: 0, learned_steps: body.learned_steps ?? [] });
  }),

  // Math
  http.post(`${BASE}/math/submit`, () => HttpResponse.json({
    verdict: "correct",
    feedback: "ممتاز! إجابتك صحيحة.",
    extracted: { final_answer: "5", steps: ["عدّ الأصابع: 5"] },
  })),
];
