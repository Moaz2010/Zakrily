/**
 * Typed fetch client for the Zakrely API.
 *
 * All calls go through `apiFetch` which:
 * - Reads NEXT_PUBLIC_API_URL (defaults to http://localhost:8000)
 * - Attaches Authorization header when a token is stored
 * - Throws a structured ApiError on non-2xx responses
 *
 * In development with MSW active, the Service Worker intercepts requests
 * before they ever leave the browser — no real backend needed.
 */

import type {
  TokenResponse,
  UserOut,
  SubjectOut,
  PathNodeOut,
  LessonDetailOut,
  QuizOut,
  QuizSubmitRequest,
  QuizSubmitResponse,
  SkillScoreOut,
  PracticeNextResponse,
  PracticeSubmitRequest,
  PracticeSubmitResponse,
  CreateSessionRequest,
  SessionOut,
  ChatMessageRequest,
  ChatMessageResponse,
  MathSubmitResponse,
  RegisterRequest,
  LoginRequest,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("zakrely_token") : null;

  const headers: Record<string, string> = {
    ...(init.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(res.statusText), { status: res.status, body: err });
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: RegisterRequest) =>
    apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: LoginRequest) =>
    apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => apiFetch<UserOut>("/me"),
};

// ── Subjects ──────────────────────────────────────────────────────────────────

export const subjectsApi = {
  list: () => apiFetch<SubjectOut[]>("/subjects"),

  path: (slug: string) =>
    apiFetch<PathNodeOut[]>(`/subjects/${slug}/path`),
};

// ── Lessons ───────────────────────────────────────────────────────────────────

export const lessonsApi = {
  get: (id: number) => apiFetch<LessonDetailOut>(`/lessons/${id}`),

  quiz: (id: number) => apiFetch<QuizOut>(`/lessons/${id}/quiz`),

  submitQuiz: (id: number, body: QuizSubmitRequest) =>
    apiFetch<QuizSubmitResponse>(`/lessons/${id}/quiz/submit`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Skills ────────────────────────────────────────────────────────────────────

export const skillsApi = {
  mySkills: (subject?: string) =>
    apiFetch<SkillScoreOut[]>(
      `/me/skills${subject ? `?subject=${subject}` : ""}`
    ),
};

// ── Practice ──────────────────────────────────────────────────────────────────

export const practiceApi = {
  next: (subject?: string, n?: number) => {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (n !== undefined) params.set("n", String(n));
    const qs = params.toString();
    return apiFetch<PracticeNextResponse>(`/practice/next${qs ? `?${qs}` : ""}`);
  },

  submit: (body: PracticeSubmitRequest) =>
    apiFetch<PracticeSubmitResponse>("/practice/submit", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export const chatApi = {
  createSession: (body: CreateSessionRequest) =>
    apiFetch<SessionOut>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  sendMessage: (sessionId: number, body: ChatMessageRequest) =>
    apiFetch<ChatMessageResponse>(`/chat/sessions/${sessionId}/message`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Math ──────────────────────────────────────────────────────────────────────

export const mathApi = {
  /** Multipart: image file + question_id form field */
  submit: (image: File, questionId: number) => {
    const form = new FormData();
    form.append("image", image);
    form.append("question_id", String(questionId));
    return apiFetch<MathSubmitResponse>("/math/submit", {
      method: "POST",
      body: form,
    });
  },
};
