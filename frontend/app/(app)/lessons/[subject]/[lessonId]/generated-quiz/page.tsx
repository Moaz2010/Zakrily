"use client";

import { useParams } from "next/navigation";
import { GeneratedLessonQuiz } from "@/components/GeneratedLessonQuiz";

export default function GeneratedQuizPage() {
  const { subject, lessonId } = useParams<{ subject: string; lessonId: string }>();
  return <GeneratedLessonQuiz key={`${subject}-${lessonId}`} subject={subject} lessonId={Number(lessonId)} />;
}
