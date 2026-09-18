"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { mathApi } from "@/lib/api";
import { CardDoodle } from "./CardDoodle";
import styles from "./MathPracticeChat.module.css";

type ChatMessage = {
  id: string;
  kind: "nawwara" | "student";
  text?: string;
  imageUrl?: string;
  actions?: boolean;
  label?: string;
};

function readableError(error: unknown) {
  const detail = (error as { body?: { detail?: string } })?.body?.detail;
  return typeof detail === "string" && /[\u0600-\u06ff]/.test(detail)
    ? detail : "مش قادرين نكمل دلوقتي. اتأكدي من الاتصال وجربي تاني.";
}

function CameraIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M8 5 9.5 3h5L16 5h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><circle cx="12" cy="12.5" r="4" /></svg>;
}

export function MathPracticeChat({ lessonId }: { lessonId: number }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const thread = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const photoUrls = useRef<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [canUpload, setCanUpload] = useState(false);
  const [retryQuestion, setRetryQuestion] = useState(false);

  useEffect(() => {
    void loadQuestion();
    const urls = photoUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);

  useEffect(() => {
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }, [messages, checking, loadingQuestion]);

  async function loadQuestion() {
    if (pending.current) return;
    pending.current = true;
    setLoadingQuestion(true);
    setError("");
    setRetryQuestion(false);
    setCanUpload(false);
    setMessages((current) => current.map((message) => ({ ...message, actions: false })));
    try {
      const response = await mathApi.tutorQuestion();
      setQuestion(response.question);
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), kind: "nawwara", text: response.question, label: "يلا نحلّ السؤال ده",
      }]);
      setCanUpload(true);
    } catch (requestError) {
      setError(readableError(requestError));
      setRetryQuestion(true);
    } finally {
      setLoadingQuestion(false);
      pending.current = false;
    }
  }

  async function submitPhoto(file: File) {
    if (!question || pending.current || !canUpload) return;
    if (fileInput.current) fileInput.current.value = "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("اختاري صورة واضحة للحل بصيغة JPG أو PNG أو WebP.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("الصورة كبيرة شوية. اختاري صورة حجمها ٢٠ ميجابايت أو أقل.");
      return;
    }
    pending.current = true;
    setError("");
    setCanUpload(false);
    setChecking(true);
    const imageUrl = URL.createObjectURL(file);
    photoUrls.current.push(imageUrl);
    setMessages((current) => [...current, {
      id: crypto.randomUUID(), kind: "student", imageUrl, label: "محاولتك",
    }]);
    try {
      const response = await mathApi.tutorFeedback(file, question);
      setMessages((current) => [...current, {
        id: crypto.randomUUID(), kind: "nawwara", text: response.feedback, actions: true, label: "نراجع سوا",
      }]);
    } catch (requestError) {
      setError(readableError(requestError));
      setCanUpload(true);
    } finally {
      setChecking(false);
      pending.current = false;
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function tryAgain() {
    setMessages((current) => current.map((message) => ({ ...message, actions: false })));
    setError("");
    setCanUpload(true);
  }

  return (
    <section className={styles.page} dir="rtl" aria-label="مصحح رياضي">
      <header className={styles.header}>
        <CardDoodle className={styles.doodle} />
        <div className={styles.headingRow}>
          <span className={styles.subject}>رياضيات · مع نوارا</span>
          <Link className={styles.back} href={`/lessons/math/${lessonId}`} aria-label="العودة للدرس"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m15 4-8 8 8 8" /></svg></Link>
        </div>
        <div className={styles.headerCopy}>
          <h1>مصحح رياضي<span className={styles.sparkle} aria-hidden="true">✳</span></h1>
          <p>كل محاولة بتقرّبك للحل. خلّينا نراجع سوا!</p>
        </div>
      </header>

      <div className={styles.workspace}>
        <ol className={styles.steps} aria-label="خطوات تصحيح الحل">
          {["حلّي السؤال", "صوّري الحل", "راجعي خطواتك"].map((label, index) => <li key={label} className={(checking || messages.some((message) => message.actions) ? 2 : question ? 1 : 0) === index ? styles.activeStep : ""}><span>{["١", "٢", "٣"][index]}</span>{label}</li>)}
        </ol>
        <div className={styles.tutorIntro}>
          <Image className={styles.headerAvatar} src="/nawwara.jpeg" width={48} height={48} alt="نوارا" priority />
          <div><h2>خطوة بخطوة مع نوارا</h2><p>حلّي على ورقة، وأنا أساعدك تفهمي كل خطوة.</p></div>
        </div>

      <div ref={thread} className={styles.thread} role="log" aria-label="السؤال ومراجعة الحل" aria-live="polite" aria-busy={loadingQuestion || checking}>
        {messages.map((message) => (
          <div key={message.id} className={`${styles.row} ${message.kind === "nawwara" ? styles.nawwaraRow : styles.studentRow}`}>
            {message.kind === "nawwara" && <Image className={styles.messageAvatar} src="/nawwara.jpeg" width={38} height={38} alt="نوارا" />}
            <div className={`${styles.bubble} ${message.kind === "student" ? styles.studentBubble : ""}`}>
              <span className={styles.messageLabel}>{message.label}</span>
              {message.imageUrl ? <img className={styles.solutionPhoto} src={message.imageUrl} alt="صورة حل الطالبة" /> : <p dir="auto">{message.text}</p>}
              {message.actions && (
                <div className={styles.actions}>
                  <button type="button" onClick={() => void loadQuestion()}>سؤال جديد</button>
                  <button type="button" className={styles.tryAgain} onClick={tryAgain}>أجرب تاني</button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loadingQuestion && <div className={`${styles.row} ${styles.nawwaraRow}`}><Image className={styles.messageAvatar} src="/nawwara.jpeg" width={38} height={38} alt="نوارا" /><div className={styles.bubble}>بجهزلك سؤال مناسب...</div></div>}
        {checking && <div className={`${styles.row} ${styles.nawwaraRow}`}><Image className={styles.messageAvatar} src="/nawwara.jpeg" width={38} height={38} alt="نوارا" /><div className={styles.bubble}>ببص على خطواتك كويس...</div></div>}
      </div>
        {error && <div className={styles.error} role="alert"><p>{error}</p>{retryQuestion && <button type="button" disabled={loadingQuestion} onClick={() => void loadQuestion()}>حاولي تاني</button>}</div>}

      <footer className={styles.composer}>
        <div className={styles.uploadHint}><span className={styles.cameraBadge}><CameraIcon /></span><div><h3>{checking ? "بنراجع خطواتك…" : "ورّينا حلك"}</h3><p>صوّري الورقة كاملة وفي إضاءة واضحة</p></div></div>
        <input ref={fileInput} className={styles.fileInput} type="file" aria-label="اختاري صورة الحل" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void submitPhoto(file);
        }} />
        <button type="button" className={styles.uploadButton} disabled={!canUpload || checking || loadingQuestion} onClick={() => fileInput.current?.click()} aria-label="تصوير أو رفع الحل">
          <CameraIcon />
          {checking ? "نوارا بتراجع..." : "صوّري أو ارفعي الحل"}
        </button>
        <p className={styles.fileNote}>JPG، PNG أو WebP · لحد ٢٠ ميجابايت</p>
      </footer>
      </div>
    </section>
  );
}
