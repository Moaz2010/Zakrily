"use client";

import { useParams } from "next/navigation";
import { MathPracticeChat } from "@/components/MathPracticeChat";

export default function MathCorrectorPage() {
  const { subject, lessonId } = useParams<{ subject: string; lessonId: string }>();
  if (subject !== "math") return <p dir="rtl">المصحح ده خاص بالرياضيات.</p>;
  return <MathPracticeChat key={lessonId} lessonId={Number(lessonId)} />;
}
