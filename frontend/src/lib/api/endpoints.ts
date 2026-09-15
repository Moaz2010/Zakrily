import { apiClient } from "./client";
import type {
  ChatMessageResponse,
  LessonDetail,
  MathSubmitResponse,
  PathNode,
  PracticeSetOut,
  QuizOut,
  QuizSubmitResponse,
  SkillBreakdownItem,
  SubjectOut,
  TokenResponse,
  UserOut,
} from "./types";
import type { components } from "./schema";

type PracticeSubmitResponse = components["schemas"]["PracticeSubmitResponse"];

export const authApi = {
  register: (data: { name: string; email: string; password: string; role?: "student" | "parent" }) =>
    apiClient.post<TokenResponse>("/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    apiClient.post<TokenResponse>("/auth/login", data).then((r) => r.data),
  me: () => apiClient.get<UserOut>("/me").then((r) => r.data),
};

export const subjectsApi = {
  list: () => apiClient.get<SubjectOut[]>("/subjects").then((r) => r.data),
  path: (slug: string) => apiClient.get<PathNode[]>(`/subjects/${slug}/path`).then((r) => r.data),
};

export const lessonsApi = {
  get: (lessonId: number) => apiClient.get<LessonDetail>(`/lessons/${lessonId}`).then((r) => r.data),
  quiz: (lessonId: number) => apiClient.get<QuizOut>(`/lessons/${lessonId}/quiz`).then((r) => r.data),
  submitQuiz: (lessonId: number, answers: { question_id: number; answer: string }[]) =>
    apiClient
      .post<QuizSubmitResponse>(`/lessons/${lessonId}/quiz/submit`, { answers })
      .then((r) => r.data),
};

export const skillsApi = {
  mine: (subject: string) =>
    apiClient.get<SkillBreakdownItem[]>("/me/skills", { params: { subject } }).then((r) => r.data),
};

export const practiceApi = {
  next: (subject: string, n = 5) =>
    apiClient.get<PracticeSetOut>("/practice/next", { params: { subject, n } }).then((r) => r.data),
  submit: (answers: { question_id: number; answer: string }[]) =>
    apiClient.post<PracticeSubmitResponse>("/practice/submit", { answers }).then((r) => r.data),
};

export const chatApi = {
  createSession: (lessonId: number, mode: "english_convo" | "science_explain") =>
    apiClient
      .post<{ session_id: number }>("/chat/sessions", { lesson_id: lessonId, mode })
      .then((r) => r.data),
  sendMessage: (sessionId: number, content: string) =>
    apiClient
      .post<ChatMessageResponse>(`/chat/sessions/${sessionId}/message`, { content })
      .then((r) => r.data),
};

export const mathApi = {
  submit: (image: File, questionId: number) => {
    const formData = new FormData();
    formData.append("image", image);
    formData.append("question_id", String(questionId));
    return apiClient
      .post<MathSubmitResponse>("/math/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
