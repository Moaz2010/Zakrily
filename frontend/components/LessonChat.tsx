"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { chatApi } from "@/lib/api";
import type { ChatModelOption } from "@/lib/api";
import { playMessage, playTap } from "@/lib/sounds";
import styles from "./LessonChat.module.css";

const COLORS: Record<string, string> = { science: "#346a5e", math: "#854f4a", english: "#426b8a" };
const SUGGESTIONS = ["اشرحلي الدرس ببساطة", "لخصلي أهم أفكار الدرس", "ساعديني في سؤال من الدرس"];

export function LessonChat({ lessonId, subject, lessonTitle }: {
  lessonId: number; subject: string; lessonTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [models, setModels] = useState<ChatModelOption[]>([]);
  const [model, setModel] = useState("");
  const [streaming, setStreaming] = useState(false);
  const session = useRef<number | null>(null);
  const sending = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open || models.length) return;
    chatApi.providers().then((data) => {
      if (!mounted.current) return;
      setModels(data.models);
      setModel((current) => current || data.default_model || data.models[0]?.id || "");
    }).catch(() => { /* picker is optional; the server falls back on its own */ });
  }, [open, models.length]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [open, messages, busy, error]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    setQuestion("");
    setMessages((previous) => [...previous, { role: "user", content }]);
    playTap();
    try {
      const id = session.current ?? (await chatApi.createSession({ lesson_id: lessonId, mode: "lesson_explain" })).session_id;
      session.current = id;

      let streamed = "";
      let opened = false;
      await chatApi.streamMessage(id, { content, ...(model ? { model } : {}) }, (delta) => {
        if (!mounted.current) return;
        streamed += delta;
        if (!opened) {
          // First token: turn the thinking indicator into a live message.
          opened = true;
          playMessage();
          setBusy(false);
          setStreaming(true);
          setMessages((previous) => [...previous, { role: "assistant", content: streamed }]);
        } else {
          setMessages((previous) => {
            const next = [...previous];
            next[next.length - 1] = { role: "assistant", content: streamed };
            return next;
          });
        }
      });
      if (!opened && mounted.current) {
        throw new Error("empty stream");
      }
    } catch {
      if (mounted.current) {
        setMessages((previous) => previous.slice(0, -1));
        setQuestion(content);
        setError("الرسالة ماوصلتش. اتأكد من الاتصال وجرب تبعتها تاني.");
      }
    } finally {
      sending.current = false;
      if (mounted.current) {
        setBusy(false);
        setStreaming(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(question);
  }

  return <div className={styles.widget} dir="rtl" style={{ "--chat-color": COLORS[subject] ?? COLORS.science } as CSSProperties}>
    {open && <section id="lesson-chat" className={styles.panel} role="dialog" aria-labelledby="lesson-chat-title" onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); close(); }
    }}>
      <header className={styles.header}>
        <img src="/nawwara.jpeg" alt="" width={46} height={46} />
        <div className={styles.heading}><h2 id="lesson-chat-title">اسأل نُوّارة ✨</h2><p>نفهم الدرس سوا، خطوة بخطوة</p></div>
        <button type="button" className={styles.close} onClick={close} aria-label="إغلاق المحادثة">×</button>
      </header>
      <p className={styles.lesson}><span>بنتكلم عن</span><bdi>{lessonTitle}</bdi></p>
      {models.length > 1 && <p className={styles.modelRow}>
        <label htmlFor="lesson-chat-model">الموديل</label>
        <select id="lesson-chat-model" value={model} disabled={busy} onChange={(event) => setModel(event.target.value)}>
          {models.map((option) => <option key={option.id} value={option.id}>
            {option.label}{option.cost === "high" ? " — أغلى 💰" : " — اقتصادي"}
          </option>)}
        </select>
        {models.find((option) => option.id === model)?.cost === "high" &&
          <span className={styles.costHint}>الموديل ده بيكلّف أكتر في الاستخدام</span>}
      </p>}
      <div ref={log} className={styles.messages} role="log" aria-label="رسائل المحادثة" aria-live="polite" aria-relevant="additions" aria-busy={busy}>
        {messages.length === 0 && <div className={styles.welcome}>
          <span className={styles.sparkle} aria-hidden="true">✦</span>
          <h3>في حاجة مش واضحة؟</h3>
          <p>أنا نُوّارة! اسألني عن الدرس ده وهشرحهولك بالمصري بطريقة بسيطة.</p>
          <div className={styles.suggestions}>{SUGGESTIONS.map((text) => <button key={text} type="button" disabled={busy} onClick={() => void send(text)}>{text}<span aria-hidden="true">↗</span></button>)}</div>
        </div>}
        {messages.map((message, index) => <div key={index} className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant} ${streaming && index === messages.length - 1 && message.role === "assistant" ? styles.streaming : ""}`}>
          <span className={styles.speaker}>{message.role === "user" ? "أنت" : "نُوّارة ✨"}</span>
          {message.role === "assistant" ? <ChatReply text={message.content} /> : <p dir="auto">{message.content}</p>}
        </div>)}
        {busy && <p className={styles.thinking} role="status">نُوّارة بتجهزلك الشرح<span aria-hidden="true">•••</span></p>}
      </div>
      <form className={styles.composer} onSubmit={submit}>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.inputRow}>
          <input ref={input} aria-label="سؤالك عن الدرس" placeholder="اكتب سؤالك هنا…" dir="auto" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={4000} readOnly={busy} required />
          <button type="submit" aria-label="إرسال السؤال" disabled={busy || !question.trim()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m21 3-7 18-4-7-7-4 18-7ZM21 3 10 14" /></svg></button>
        </div>
        <small>الشرح من محتوى الدرس • راجع إجابتك مع الكتاب</small>
      </form>
    </section>}
    <button ref={launcher} type="button" className={styles.launcher} aria-expanded={open} aria-controls={open ? "lesson-chat" : undefined} aria-label={open ? "إغلاق نُوّارة" : "اسأل نُوّارة عن الدرس"} onClick={() => open ? close() : setOpen(true)}>
      {open ? <span className={styles.launcherClose} aria-hidden="true">×</span> : <><img src="/nawwara.jpeg" alt="" width={48} height={48} /><span className={styles.badge} aria-hidden="true">✦</span></>}
      {!open && <span className={styles.tooltip}>اسأل نُوّارة</span>}
    </button>
  </div>;
}

function ChatReply({ text }: { text: string }) {
  return <div className={styles.reply} dir="auto">{parseBlocks(text).map((block, index) => {
    if (block.type === "h") {
      const Tag = block.level === 1 ? "h3" : "h4";
      return <Tag key={index}>{renderInline(block.text, `h-${index}`)}</Tag>;
    }
    if (block.type === "ul" || block.type === "ol") {
      const Tag = block.type;
      return <Tag key={index}>{block.items.map((item, itemIndex) =>
        <li key={itemIndex}>{renderInline(item, `l-${index}-${itemIndex}`)}</li>)}</Tag>;
    }
    if (block.type === "p") {
      return <p key={index}>{renderInline(block.text, `p-${index}`)}</p>;
    }
    return null;
  })}</div>;
}

type Block =
  | { type: "p"; text: string }
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "ul" | "ol"; items: string[] };

function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushParagraph() {
    const text = paragraph.join("\n").trim();
    paragraph = [];
    if (!text) return;
    const headingOnly = text.match(/^\*\*(.+)\*\*$/);
    if (headingOnly && !headingOnly[1].includes("**")) {
      blocks.push({ type: "h", level: 3, text: headingOnly[1] });
    } else {
      blocks.push({ type: "p", text });
    }
  }
  function flushList() {
    if (list) blocks.push(list);
    list = null;
  }

  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+?)\s*$/);
    const bullet = line.match(/^\s{0,3}[-*•]\s+(.+)$/);
    const numbered = line.match(/^\s{0,3}\d+[.)]\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h", level: Math.min(heading[1].length, 3) as 1 | 2 | 3, text: heading[2] });
    } else if (bullet) {
      flushParagraph();
      if (list?.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(bullet[1]);
    } else if (numbered) {
      flushParagraph();
      if (list?.type !== "ol") { flushList(); list = { type: "ol", items: [] }; }
      list.items.push(numbered[1]);
    } else if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line) || !line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*([^*]+)\*/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${index++}`;
    if (match[1] != null || match[2] != null) nodes.push(<strong key={key}>{match[1] ?? match[2]}</strong>);
    else if (match[3] != null) nodes.push(<code key={key}>{match[3]}</code>);
    else nodes.push(<em key={key}>{match[4]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
