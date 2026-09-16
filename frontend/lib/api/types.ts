/** Public API names retained for the UI; DTOs are generated from FastAPI. */
export * from "./schema";
export type {
  AnswerSubmission as AnswerIn,
  PathNode as PathNodeOut,
  LessonDetail as LessonDetailOut,
  QuestionPublic as QuestionOut,
  SkillBreakdownItem as SkillResult,
  SkillBreakdownItem as SkillScoreOut,
  PracticeSetOut as PracticeNextResponse,
  ChatSessionCreateRequest as CreateSessionRequest,
  ChatSessionCreateResponse as SessionOut,
} from "./schema";
