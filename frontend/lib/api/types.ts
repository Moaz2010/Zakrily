/**
 * Typed API types — generated from openapi.json (BE-01 output).
 * DO NOT EDIT manually. Regenerate from openapi.json when the contract changes.
 * Schema source: backend/openapi.json
 */

// ── Request bodies ────────────────────────────────────────────────────────────

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: string; // default: "student"
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AnswerIn {
  question_id: number;
  answer?: string;
  given_answer?: string;
}

export interface QuizSubmitRequest {
  answers: AnswerIn[];
}

export interface PracticeSubmitRequest {
  answers: AnswerIn[];
}

export interface CreateSessionRequest {
  lesson_id: number;
  mode: "english_convo" | "science_explain";
}

export interface ChatMessageRequest {
  content: string;
}

// ── Response shapes ───────────────────────────────────────────────────────────

export interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface TokenResponse {
  token: string;
  user: UserOut;
}

export interface SubjectOut {
  id: number;
  slug: "english" | "math" | "science";
  name_ar: string;
  name_en: string;
}

export interface PathNodeOut {
  lesson_id: number;
  order: number;
  title: string;
  status: "locked" | "unlocked" | "completed";
  score?: number | null;
}

export interface LessonSectionOut {
  id: number;
  order_index: number;
  heading: string;
  body_md: string;
}

export interface LessonDetailOut {
  id: number;
  title: string;
  objective: string;
  is_published: boolean;
  sections: LessonSectionOut[];
}

/** Question as served to the student — no correct_answer field. */
export interface QuestionOut {
  id: number;
  qtype: "mcq" | "short_answer" | "numeric";
  body: string;
  options?: unknown[] | null;
  skill_tag: string;
}

export interface QuizOut {
  questions: QuestionOut[];
}

export interface SkillResult {
  skill_tag: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface QuestionResult {
  question_id: number;
  is_correct: boolean;
  correct_answer: string;
  explanation?: string | null;
}

export interface QuizSubmitResponse {
  score: number;
  results: QuestionResult[];
  skill_breakdown: SkillResult[];
  unlocked_next: boolean;
}

export interface SkillScoreOut {
  skill_tag: string;
  label_ar: string;
  correct: number;
  total: number;
  accuracy: number;
  insufficient_data: boolean;
}

export interface PracticeNextResponse {
  questions: QuestionOut[];
}

export interface PracticeSubmitResponse {
  results: Record<string, unknown>[];
  skill_breakdown: SkillResult[];
}

export interface SessionOut {
  session_id: number;
}

export interface ChatMessageResponse {
  reply: string;
  done: boolean;
  feedback?: string | null;
}

export interface MathSubmitResponse {
  verdict: "correct" | "incorrect" | "unreadable";
  feedback: string;
  extracted?: Record<string, unknown> | null;
}

// ── Error shape ───────────────────────────────────────────────────────────────

export interface ApiError {
  detail: Array<{ loc: (string | number)[]; msg: string; type: string }>;
}
