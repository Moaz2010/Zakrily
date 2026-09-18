"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { QuestionOut } from "@/lib/api";
import { placeToken, readPlacements } from "@/lib/math-interaction";
import styles from "./MathQuestion.module.css";

function inline(text: string): ReactNode {
  return text.split(/(\*\*.+?\*\*|`.+?`)/g).map((part, i) => part.startsWith("**")
    ? <strong key={i}>{part.slice(2, -2)}</strong> : part.startsWith("`") ? <span key={i}>{part.slice(1, -1)}</span> : part);
}

/** Render worksheet paragraphs and tables without exposing raw Markdown. */
export function MathText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    if (lines[i].trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!/^\|[\s:|\-]+\|$/.test(lines[i].trim())) rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
        i++;
      }
      i--;
      blocks.push(<div key={`table-${i}`} className={styles.tableWrap} tabIndex={0} role="region" aria-label="Question data table"><table><thead><tr>{rows[0]?.map((cell, j) => <th key={j}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
    } else {
      blocks.push(<p key={i}>{inline(lines[i].replace(/^#+\s*/, "").replace(/^\* /, "• "))}</p>);
    }
  }
  return <div className={styles.source} dir="ltr" lang="en">{blocks}</div>;
}

const shapeSymbols: Record<string, string> = { circle: "◯", square: "□", underline: "▁" };

export function MathQuestion({ question, answer, onChange, disabled }: {
  question: QuestionOut & { scored?: boolean }; answer: string; onChange: (value: string) => void; disabled: boolean;
}) {
  const activity = question.interaction;
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ token: string; x: number; y: number; moved: boolean } | null>(null);
  const ignoreClick = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [hoverSlot, setHoverSlot] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const values = readPlacements(answer);
  const slots = activity?.slots ?? [];
  const tokens = activity?.tokens ?? [];
  const digitOrder = activity?.kind === "order" && tokens.every((token) => /^\d$/.test(token.label));
  const isMarker = activity?.kind === "mark_digits";
  const activeTokens = isMarker ? slots.map((slot) => ({ id: slot.id, label: `${shapeSymbols[slot.shape ?? "circle"]} ${slot.label}` })) : tokens;
  const tokenLabel = (id: string) => activeTokens.find((token) => token.id === id)?.label ?? id;

  function place(target: string, token: string | null = selected) {
    if (disabled || !token || !activity) return;
    const next = isMarker
      ? { ...values, [token]: target }
      : placeToken(values, target, token, !!activity.reusable);
    onChange(JSON.stringify(next));
    setSelected(null);
    setAnnouncement(`${tokenLabel(token)} — تم وضع البطاقة`);
  }

  function targetAt(x: number, y: number) {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-math-slot]");
    return element && root.current?.contains(element) ? element.dataset.mathSlot ?? null : null;
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, token: string) {
    if (disabled || event.button !== 0) return;
    ignoreClick.current = false;
    drag.current = { token, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!drag.current) return;
    if (Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) > 6) drag.current.moved = true;
    if (!drag.current.moved) return;
    setDragPosition({ x: event.clientX, y: event.clientY });
    setHoverSlot(targetAt(event.clientX, event.clientY));
  }
  function stopDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.moved) {
      const target = targetAt(event.clientX, event.clientY);
      if (target !== null) place(target, drag.current.token);
      ignoreClick.current = true;
    }
    drag.current = null;
    setHoverSlot(null);
    setDragPosition(null);
  }

  function tile(id: string, label: string, inSlot = false) {
    return <button key={id} type="button" disabled={disabled} className={`${styles.tile} ${selected === id ? styles.selected : ""} ${inSlot ? styles.placed : ""}`}
      aria-pressed={selected === id} aria-label={`${label} — اختار واسحب أو اضغط على المكان`}
      onClick={() => { if (ignoreClick.current) { ignoreClick.current = false; return; } setSelected(id); setAnnouncement(`تم اختيار ${label}. اختار المكان.`); }}
      onPointerDown={(event) => startDrag(event, id)} onPointerMove={moveDrag} onPointerUp={stopDrag}
      onPointerCancel={() => { drag.current = null; setDragPosition(null); setHoverSlot(null); }}>
      {label}<span className={styles.grip} aria-hidden="true">⠿</span>
    </button>;
  }

  function dropSlot(id: string, label: string, index: number) {
    const token = tokens.find((t) => t.id === values[id]);
    return <div key={id} className={`${styles.slotCard} ${hoverSlot === id ? styles.hover : ""}`}>
      <span className={styles.slotLabel}>{label}</span>
      <button type="button" data-math-slot={id} disabled={disabled} className={`${styles.slot} ${values[id] ? styles.filled : ""}`}
        aria-label={`${label}: ${token?.label ?? "فارغ"}`}
        style={values[id] && !activity?.reusable ? { touchAction: "none" } : undefined}
        onPointerDown={(event) => { if (values[id] && !activity?.reusable) startDrag(event, values[id]); }}
        onPointerMove={moveDrag} onPointerUp={stopDrag}
        onPointerCancel={() => { drag.current = null; setDragPosition(null); setHoverSlot(null); }}
        onClick={() => { if (ignoreClick.current) { ignoreClick.current = false; return; } if (selected) place(id); else if (values[id]) setSelected(values[id]); }}>
        {token?.label ?? <span aria-hidden="true">{activity?.kind === "order" ? index + 1 : "+"}</span>}
      </button>
    </div>;
  }

  return <div ref={root} className={styles.question}>
    <MathText text={question.body} />
    {activity ? <>
      <p className={styles.instruction} dir="rtl">{activity.instruction}</p>
      {isMarker ? <>
        <div className={styles.palette} dir="ltr">{activeTokens.map((token) => tile(token.id, token.label))}</div>
        <div className={styles.digitGroups} dir="ltr" aria-label="أرقام العدد">
          {(activity.number?.split(",") ?? []).map((group, groupIndex, groups) => <div key={groupIndex} className={styles.digitGroup}>
          <span className={styles.periodName}>{["Ones", "Thousands", "Millions", "Milliards"][groups.length - groupIndex - 1]}</span>
          <div className={styles.digits}>
          {group.split("").map((digit, localIndex) => { const index = groups.slice(0, groupIndex).join("").length + localIndex; return <div key={index} className={styles.digitWrap}>
            <button type="button" disabled={disabled} data-math-slot={String(index)} className={`${styles.digit} ${hoverSlot === String(index) ? styles.hover : ""}`}
              aria-label={`Digit ${digit}, position ${index + 1}`} onClick={() => place(String(index))}>
              {digit}
              {slots.filter((slot) => values[slot.id] === String(index)).map((slot) => <span key={slot.id} className={`${styles.mark} ${styles[slot.shape ?? "circle"]}`} aria-label={slot.label} />)}
            </button>
          </div>; })}
          </div></div>)}
        </div>
        <div className={styles.markLegend}>{slots.map((slot) => <span key={slot.id}>{shapeSymbols[slot.shape ?? "circle"]} {slot.label}: {values[slot.id] === undefined ? "—" : "تم وضع العلامة"}</span>)}</div>
      </> : activity.kind === "number_line" ? <>
        <div className={styles.numberLine} dir="ltr">
          <div className={styles.line}>
            <span className={styles.midTick} />
            <span className={styles.numberPin} style={{ left: `${100 * (activity.value! - activity.lower!) / (activity.upper! - activity.lower!)}%` }}>{activity.value?.toLocaleString("en-US")}</span>
          </div>
          <div className={styles.endpoints}>{[activity.lower!, activity.upper!].map((number) => <button key={number} type="button" disabled={disabled} aria-pressed={values.rounded === String(number)} className={values.rounded === String(number) ? styles.chosenEndpoint : ""}
            onClick={() => onChange(JSON.stringify({ ...values, rounded: String(number) }))}>{number.toLocaleString("en-US")}</button>)}</div>
        </div>
        <label className={styles.field}>Midpoint<input disabled={disabled} inputMode="numeric" value={values.midpoint ?? ""} onChange={(event) => onChange(JSON.stringify({ ...values, midpoint: event.target.value }))} placeholder="?" dir="ltr" /></label>
        <p className={styles.hint}>اضغط على أحد طرفي الخط لاختيار ناتج التقريب.</p>
      </> : activity.kind === "fields" ? <div className={styles.fields} dir="ltr">{slots.map((slot) => <label key={slot.id} className={styles.field}>{slot.label}<input disabled={disabled} inputMode="numeric" value={values[slot.id] ?? ""} maxLength={60} onChange={(event) => onChange(JSON.stringify({ ...values, [slot.id]: event.target.value }))} placeholder="?" /></label>)}</div>
      : <>
        {activity.number && <div className={styles.targetNumber} dir="ltr">{activity.number}</div>}
        {activity.kind === "compare" ? <div className={styles.comparison} dir="ltr"><MathText text={activity.left ?? ""} />{dropSlot("sign", "?", 0)}<MathText text={activity.right ?? ""} /></div>
          : <div className={`${styles.slots} ${activity.kind === "order" ? digitOrder ? styles.digitOrder : styles.orderSlots : ""}`} style={digitOrder ? { "--digit-count": slots.length } as CSSProperties : undefined} dir="ltr">{slots.map((slot, index) => dropSlot(slot.id, slot.label, index))}</div>}
        <div className={styles.palette} dir="ltr" aria-label="بطاقات الإجابة">{tokens.filter((token) => activity.reusable || !Object.values(values).includes(token.id)).map((token) => tile(token.id, token.label))}</div>
      </>}
      <div className={styles.controls}><span className={styles.hint}>{activity.kind === "number_line" || activity.kind === "fields" ? "خد وقتك وفكّر في كل خطوة." : "اسحب، أو اختار البطاقة واضغط على مكانها."}</span><button type="button" disabled={disabled || !Object.keys(values).length} onClick={() => { onChange(""); setSelected(null); setAnnouncement("تم مسح المحاولة"); }}>ابدأ من جديد ↺</button></div>
    </> : question.options ? <div className={styles.choices} dir="ltr">{Object.entries(question.options).map(([key, value]) => <button key={key} type="button" disabled={disabled} aria-pressed={answer === key} className={`${styles.choice} ${answer === key ? styles.selected : ""}`} onClick={() => onChange(key)}><span className={styles.optionLetter}>{key}</span><MathText text={String(value)} /></button>)}</div>
    : <label className={styles.field} dir="rtl">{question.scored === false ? "اشرح فكرتك · من غير درجات" : "إجابتك"}
      {question.qtype === "numeric" ? <input disabled={disabled} inputMode="decimal" dir="ltr" value={answer} maxLength={60} onChange={(event) => onChange(event.target.value)} placeholder="اكتب العدد هنا" />
        : <textarea disabled={disabled} dir="auto" value={answer} rows={4} maxLength={4000} onChange={(event) => onChange(event.target.value)} placeholder="اكتب فكرتك، وبعدين قارن بالشرح" />}
    </label>}
    <span className={styles.srOnly} role="status">{announcement}</span>
    {dragPosition && drag.current && <div className={styles.dragGhost} style={{ left: dragPosition.x, top: dragPosition.y }} aria-hidden="true">{tokenLabel(drag.current.token)}</div>}
  </div>;
}
