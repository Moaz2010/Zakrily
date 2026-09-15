import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "../client";

const url = (path: string) => `${API_BASE_URL}${path}`;

const fixtureUser = { id: 1, name: "Test Student", email: "student@example.com", role: "student" };

const fixtureSubjects = [
  { id: 1, slug: "english", name_ar: "اللغة الإنجليزية", name_en: "English" },
  { id: 2, slug: "math", name_ar: "الرياضيات", name_en: "Math" },
  { id: 3, slug: "science", name_ar: "العلوم", name_en: "Science" },
];

const fixturePath = [
  { lesson_id: 1, order: 1, title: "Lesson 1", status: "unlocked", score: null },
  { lesson_id: 2, order: 2, title: "Lesson 2", status: "locked", score: null },
  { lesson_id: 3, order: 3, title: "Lesson 3", status: "locked", score: null },
];

const skillTags = ["memorization", "comprehension", "application", "analysis"] as const;

export const handlers = [
  http.post(url("/auth/register"), async () => {
    return HttpResponse.json({ token: "mock-token", user: fixtureUser });
  }),
  http.post(url("/auth/login"), async () => {
    return HttpResponse.json({ token: "mock-token", user: fixtureUser });
  }),
  http.get(url("/me"), () => HttpResponse.json(fixtureUser)),

  http.get(url("/subjects"), () => HttpResponse.json(fixtureSubjects)),
  http.get(url("/subjects/:slug/path"), () => HttpResponse.json(fixturePath)),

  http.get(url("/lessons/:id"), ({ params }) => {
    return HttpResponse.json({
      lesson: {
        id: Number(params.id),
        subject_id: 1,
        order_index: 1,
        title: `Lesson ${params.id}`,
        objective: "Sample objective for prototype fixture.",
      },
      sections: [
        { id: 1, order_index: 1, heading: "Introduction", body_md: "Sample lesson content." },
        { id: 2, order_index: 2, heading: "Key Points", body_md: "- Point one\n- Point two" },
      ],
    });
  }),

  http.get(url("/lessons/:id/quiz"), ({ params }) => {
    return HttpResponse.json({
      questions: [
        {
          id: 1,
          lesson_id: Number(params.id),
          skill_tag: "memorization",
          qtype: "mcq",
          body: "Sample MCQ question?",
          options: { a: "Option A", b: "Option B", c: "Option C" },
        },
        {
          id: 2,
          lesson_id: Number(params.id),
          skill_tag: "application",
          qtype: "short_answer",
          body: "Sample short-answer question?",
          options: null,
        },
      ],
    });
  }),

  http.post(url("/lessons/:id/quiz/submit"), async ({ request }) => {
    const body = (await request.json()) as { answers: { question_id: number; answer: string }[] };
    return HttpResponse.json({
      score: 1.0,
      results: body.answers.map((a) => ({
        question_id: a.question_id,
        given_answer: a.answer,
        is_correct: true,
        correct_answer: a.answer,
        explanation: "Sample explanation.",
        skill_tag: "memorization",
      })),
      skill_breakdown: skillTags.map((tag) => ({
        skill_tag: tag,
        correct: 1,
        total: 1,
        accuracy: 1.0,
        insufficient_data: true,
      })),
      unlocked_next: true,
    });
  }),

  http.get(url("/me/skills"), () => {
    return HttpResponse.json(
      skillTags.map((tag) => ({
        skill_tag: tag,
        correct: 0,
        total: 0,
        accuracy: null,
        insufficient_data: true,
      }))
    );
  }),

  http.get(url("/practice/next"), ({ request }) => {
    const n = Number(new URL(request.url).searchParams.get("n") ?? 5);
    return HttpResponse.json({
      questions: Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        lesson_id: 1,
        skill_tag: "analysis",
        qtype: "mcq",
        body: `Practice question ${i + 1}?`,
        options: { a: "A", b: "B" },
      })),
    });
  }),

  http.post(url("/practice/submit"), async ({ request }) => {
    const body = (await request.json()) as { answers: { question_id: number; answer: string }[] };
    return HttpResponse.json({
      results: body.answers.map((a) => ({
        question_id: a.question_id,
        given_answer: a.answer,
        is_correct: true,
        correct_answer: a.answer,
        explanation: "Sample explanation.",
        skill_tag: "analysis",
      })),
      skill_breakdown: skillTags.map((tag) => ({
        skill_tag: tag,
        correct: 1,
        total: 1,
        accuracy: 1.0,
        insufficient_data: true,
      })),
    });
  }),

  http.post(url("/chat/sessions"), () => HttpResponse.json({ session_id: 1 })),
  http.post(url("/chat/sessions/:id/message"), () => {
    return HttpResponse.json({ reply: "[mock reply]", done: false, feedback: null });
  }),

  http.post(url("/math/submit"), () => {
    return HttpResponse.json({
      verdict: "unreadable",
      feedback: "[mock] Please retake the photo.",
      extracted: { final_answer: null, steps: [] },
    });
  }),
];
