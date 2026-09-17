"use client";

import { useEffect, useRef, useState } from "react";
import { voiceApi, type VoiceReply } from "@/lib/api";
import styles from "./SubjectFeature.module.css";

type Phase = "idle" | "loading" | "ready" | "recording" | "speaking" | "done";
export function EnglishVoiceTutor({ lessonId, onClose }: { lessonId: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<number | null>(null);
  const [last, setLast] = useState<VoiceReply | null>(null);
  const [messages, setMessages] = useState<{ student: boolean; text: string }[]>([]);
  const [error, setError] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const el = dialog.current!;
    el.showModal();
    return () => {
      mounted.current = false;
      controller.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach(t => t.stop());
      player.current?.pause();
      el.close();
    };
  }, []);

  function play(result: VoiceReply, index = 0) {
    if (!mounted.current) return;
    player.current?.pause();
    if (index >= result.audio.length) { setPhase(result.done ? "done" : "ready"); return; }
    setPhase("speaking");
    const audio = new Audio(`data:audio/wav;base64,${result.audio[index]}`);
    player.current = audio;
    audio.onended = () => play(result, index + 1);
    const failed = () => { if (mounted.current) { setError("اضغط اسمع تاني لتشغيل رد نوّارة."); setPhase(result.done ? "done" : "ready"); } };
    audio.onerror = failed;
    audio.play().catch(failed);
  }

  async function request(blob?: Blob) {
    if (busy.current) return;
    busy.current = true;
    setError(""); setPhase("loading");
    controller.current = new AbortController();
    try {
      const result = blob && session !== null
        ? await voiceApi.turn(session, blob, controller.current.signal)
        : await voiceApi.start(lessonId, controller.current.signal);
      if (!mounted.current) return;
      setSession(result.session_id); setLast(result);
      setMessages(old => [...(blob ? old : []), ...(result.transcript ? [{ student: true, text: result.transcript }] : []), { student: false, text: result.reply }]);
      setError(result.audio_error ?? "");
      play(result);
    } catch (e) {
      if (!mounted.current) return;
      const detail = (e as { body?: { detail?: unknown } }).body?.detail;
      setError(typeof detail === "string" ? detail : "تعذّر الاتصال. جرّب تاني.");
      setPhase(session ? "ready" : "idle");
    } finally { busy.current = false; }
  }

  async function record() {
    if (busy.current) return;
    busy.current = true;
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("unsupported");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find(t => MediaRecorder.isTypeSupported(t));
      if (!mime) { media.getTracks().forEach(t => t.stop()); throw new Error("unsupported"); }
      const rec = new MediaRecorder(media, { mimeType: mime });
      recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        media.getTracks().forEach(t => t.stop());
        busy.current = false;
        if (mounted.current) void request(new Blob(chunks, { type: mime }));
      };
      rec.onerror = () => { media.getTracks().forEach(t => t.stop()); busy.current = false; if (mounted.current) { setError("تعذّر التسجيل. جرّب تاني."); setPhase("ready"); } };
      rec.start(); setPhase("recording");
      timer.current = setTimeout(() => { if (rec.state === "recording") rec.stop(); }, 60000);
    } catch {
      busy.current = false;
      if (mounted.current) { setError("اسمح باستخدام الميكروفون وافتح الصفحة على HTTPS أو localhost."); setPhase("ready"); }
    }
  }

  const labels: Record<Phase, string> = { idle: "نتكلم إنجليزي مع نوّارة، خطوة بخطوة", loading: "نوّارة بتجهّز الرد…", ready: "دورك! اضغط الميكروفون واتكلم", recording: "سامعاك… اضغط إرسال لما تخلص (حد أقصى دقيقة)", speaking: "نوّارة بتتكلم…", done: "برافو! خلّصت محادثتك النهارده" };
  return <dialog ref={dialog} className={styles.dialog} dir="rtl" aria-labelledby="voice-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <header className={styles.header}><h2 id="voice-title">محادثة صوتية</h2><button className={styles.close} onClick={onClose} aria-label="إغلاق المحادثة">×</button></header>
    <div className={`${styles.visual} ${phase === "recording" || phase === "speaking" ? styles.active : ""}`} aria-hidden="true"><i /><i /><i /><i /><i /><img src="/nawwara.jpeg" alt="" /></div>
    <p className={styles.status} role="status">{labels[phase]}</p>
    <div className={styles.actions}>
      {(phase === "idle" || phase === "done") && <button className={styles.primary} onClick={() => request()}>{phase === "done" ? "محادثة جديدة" : "ابدأ المحادثة"}</button>}
      {phase === "ready" && <button className={styles.primary} onClick={record}>🎙 اتكلم</button>}
      {phase === "recording" && <button className={styles.primary} onClick={() => { if (recorder.current?.state === "recording") recorder.current.stop(); }}>إرسال التسجيل</button>}
      {phase === "speaking" && <button className={styles.secondary} onClick={() => { player.current?.pause(); setPhase(last?.done ? "done" : "ready"); }}>إيقاف الصوت</button>}
      {last && last.audio.length > 0 && (phase === "ready" || phase === "done") && <button className={styles.secondary} onClick={() => play(last)}>اسمع تاني</button>}
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.messages} aria-label="نص المحادثة" aria-live="polite">{messages.map((m, i) => <p key={i} dir="auto" className={`${styles.message} ${m.student ? styles.student : ""}`}><strong>{m.student ? "أنت" : "نوّارة"}</strong><br />{m.text}</p>)}</div>
  </dialog>;
}
