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
  ActivityState, ActivityAnswer, ActivityProgress,
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
  ChatProvidersResponse,
  MathSubmitResponse,
  RegisterRequest,
  LoginRequest,
  LearnerStats,
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

  const res = await fetch(`${BASE_URL}${path}`, { cache: "no-store", ...init, headers });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && token) {
      localStorage.removeItem("zakrely_token");
      window.dispatchEvent(new Event("zakrely:unauthorized"));
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(res.statusText), { status: res.status, body: err });
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

export const progressApi = {
  stats: () => apiFetch<LearnerStats>(`/me/stats?timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`),
};

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
  restartActivity: (id: number) => apiFetch<ActivityState>(`/lessons/${id}/activity/restart`, { method: "POST" }),
  activity: (id: number, practice = false) => apiFetch<ActivityState>(`/lessons/${id}/activity?practice=${practice}`),
  answerActivity: (id: number, body: ActivityAnswer) => apiFetch<ActivityState>(`/lessons/${id}/activity/answer`, { method: "POST", body: JSON.stringify(body) }),
  saveActivity: (id: number, body: ActivityProgress) => apiFetch<ActivityState>(`/lessons/${id}/activity/progress`, { method: "PUT", body: JSON.stringify(body) }),
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
  next: (subject?: string, n?: number, lessonId?: number) => {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (n !== undefined) params.set("n", String(n));
    if (lessonId !== undefined) params.set("lesson_id", String(lessonId));
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
  providers: () => apiFetch<ChatProvidersResponse>("/chat/providers"),

  /** Streams the reply so it types out. `onDelta` fires per chunk. */
  streamMessage: async (
    sessionId: number,
    body: ChatMessageRequest,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("zakrely_token") : null;
    const res = await fetch(`${BASE_URL}/chat/sessions/${sessionId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) {
      throw Object.assign(new Error(res.statusText), { status: res.status });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE frames are separated by a blank line; keep any partial tail.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        try {
          const event = JSON.parse(line.slice(5).trim());
          if (event.error) throw new Error("stream failed");
          if (event.delta) onDelta(event.delta as string);
        } catch {
          // A malformed frame should not kill an otherwise working stream.
        }
      }
    }
  },

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
  check: (lessonId: number, questionId: number, answer: string) =>
    apiFetch<{ is_correct: boolean; correct_answer: string; explanation: string }>(`/math/lessons/${lessonId}/check`, {
      method: "POST", body: JSON.stringify({ question_id: questionId, answer }),
    }),
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

export type VoiceReply = { session_id: number; reply: string; transcript: string; audio: string[]; audio_error: string | null; done: boolean };
export const voiceApi = {
  start: (lessonId: number, signal?: AbortSignal) => apiFetch<VoiceReply>(`/voice/lessons/${lessonId}/start`, { method: "POST", signal }),
  turn: (sessionId: number, audio: Blob, signal?: AbortSignal) => {
    const form = new FormData();
    form.append("audio", audio, "recording");
    return apiFetch<VoiceReply>(`/voice/sessions/${sessionId}/turn`, { method: "POST", body: form, signal });
  },
};
