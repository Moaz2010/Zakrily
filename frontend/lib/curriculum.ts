import catalog from "./curriculum.json";
import type { PathNodeOut, SubjectOut } from "./api/types";

export const curriculum = catalog;
export const curriculumSubjects: SubjectOut[] = catalog.map(({ id, slug, name_ar, name_en }) => ({
  id, slug: slug as SubjectOut["slug"], name_ar, name_en,
}));

export function getSubject(slug: string) {
  return catalog.find((subject) => subject.slug === slug);
}

export function getCurriculumLesson(id: number) {
  for (const subject of catalog) {
    const lesson = subject.lessons.find((item) => item.id === id);
    if (lesson) return { ...lesson, subject };
  }
}

export function initialPath(slug: string): PathNodeOut[] {
  return getSubject(slug)?.lessons.map((lesson) => ({
    lesson_id: lesson.id,
    order: lesson.order,
    title: lesson.title,
    status: lesson.order === 1 ? "unlocked" : "locked",
    score: null,
  })) ?? [];
}
