"use client";
/**
 * Learning path screen — matches design image 3.
 *
 * Shows a curved SVG path with circular lesson nodes:
 *   - Teal flag  → completed (first/latest)
 *   - Dark brown atom → unlocked
 *   - Red ?      → current
 *   - Grey lock  → locked
 *
 * Header: subject name (teal bg) + progress bar + unit/lesson info.
 * Tabs: شرح (content) | تدريبات (practice)
 *
 * RTL: all layout uses logical properties.
 */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { subjectsApi, type PathNodeOut } from "@/lib/api";

const SUBJECT_LABELS: Record<string, { ar: string; bg: string }> = {
  english: { ar: "إنجليزي",   bg: "#2A4A6B" },
  math:    { ar: "رياضيات",   bg: "#6B2A28" },
  science: { ar: "علوم",      bg: "#1E5C4A" },
};

type NodeStatus = "completed" | "unlocked" | "current" | "locked";

// Node visual config
const NODE_STYLE: Record<NodeStatus, { bg: string; border: string; size: number }> = {
  completed: { bg: "#2D8A6A", border: "#3DAA82", size: 68 },
  unlocked:  { bg: "#5C3D30", border: "#7A5040", size: 52 },
  current:   { bg: "#B84040", border: "#D05050", size: 60 },
  locked:    { bg: "#3A3A3A", border: "#5A5A5A", size: 44 },
};

// Assign status based on path position
function getStatus(node: PathNodeOut): NodeStatus {
  if (node.status === "completed") return "completed";
  if (node.status === "unlocked")  return "unlocked";
  return "locked";
}

// Node icons
function NodeIcon({ status }: { status: NodeStatus }) {
  if (status === "completed") return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white">
      <path d="M5 3v16l7-4 7 4V3z" />
    </svg>
  );
  if (status === "unlocked") return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="white" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.5-6.5-1.4 1.4M6.9 17.1l-1.4 1.4M17.1 17.1l1.4-1.4M6.9 6.9 5.5 5.5" />
    </svg>
  );
  if (status === "current") return (
    <span className="text-white text-2xl font-black">?</span>
  );
  // locked
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white" opacity={0.6}>
      <path d="M18 11H6V9a6 6 0 0 1 12 0v2zm1 1H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1z" />
    </svg>
  );
}

export default function LearningPathPage() {
  const params  = useParams();
  const router  = useRouter();
  const slug    = params.subject as string;
  const config  = SUBJECT_LABELS[slug] ?? { ar: slug, bg: "#1E5C4A" };

  const [nodes, setNodes] = useState<PathNodeOut[]>([]);

  useEffect(() => {
    subjectsApi.path(slug).then(setNodes).catch(console.error);
  }, [slug]);

  // Current lesson index
  const currentIdx = nodes.findIndex((n) => n.status === "unlocked");
  const currentNode = nodes[currentIdx] ?? nodes[0];

  // Curve waypoints — distribute nodes along a winding S-curve
  // Positions are percentages of the container width/height
  const waypoints = [
    { x: 72, y: 85 },  // index 0 — bottom (completed, flag)
    { x: 45, y: 70 },  // index 1
    { x: 25, y: 55 },  // index 2 — current (red ?)
    { x: 48, y: 40 },  // index 3
    { x: 68, y: 25 },  // index 4 — locked
    { x: 50, y: 10 },  // index 5 — locked
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── Header (teal) ──────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: config.bg }} className="relative px-5 pt-12 pb-4">
        {/* Back button — RTL: arrow points right (forward in RTL) */}
        <button onClick={() => router.back()}
          className="absolute top-12 start-4 text-white/80">
          {/* RTL: mirror icon */}
          <svg viewBox="0 0 24 24" className="h-6 w-6 [transform:scaleX(-1)]" fill="none"
               stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-white font-black text-3xl text-end">{config.ar}</h1>

        {/* Progress bar + metadata */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex-1 h-2 rounded-full bg-white/20">
            <div className="h-2 rounded-full bg-[#D4813A]" style={{ width: "42%" }} />
          </div>
          <span className="text-white/80 text-sm font-semibold">42%</span>
          <div className="rounded-lg bg-white/20 px-2 py-1 flex items-center gap-1">
            <span className="text-white text-xs">📚 4 وحدات · 25 حصة</span>
          </div>
        </div>
      </div>

      {/* ── Unit/lesson info + tabs ─────────────────────────────────────── */}
      <div className="bg-white px-5 py-4 border-b border-gray-100">
        <div className="text-end">
          <p className="text-[#9A9A9A] text-sm">الدرس {currentNode?.order ?? 1}</p>
          <h2 className="text-black font-black text-2xl">
            الوحدة {Math.ceil((currentNode?.order ?? 1) / 2)}
          </h2>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-2 mt-3 justify-end">
          <button className="flex items-center gap-1 rounded-full bg-[#1E5C4A]/10
                             px-3 py-1.5 text-[#1E5C4A] text-sm font-semibold">
            <span>📖</span> شرح
          </button>
          <button className="flex items-center gap-1 rounded-full bg-gray-100
                             px-3 py-1.5 text-gray-500 text-sm">
            <span>✏️</span> تدريبات
          </button>
        </div>
      </div>

      {/* ── Path map ────────────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden bg-white" style={{ minHeight: 380 }}>
        {/* Decorative leaves */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-8 end-2 text-6xl opacity-20 select-none">🌿</div>
          <div className="absolute top-32 start-0 text-5xl opacity-15 select-none">🍃</div>
          <div className="absolute bottom-8 end-4 text-5xl opacity-15 select-none">🌿</div>
        </div>

        {/* SVG curve path */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d="M72,92 C60,80 30,70 25,55 C20,40 50,38 48,25 C46,12 50,5 50,5"
            fill="none"
            stroke="#1C1C1C"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Nodes */}
        {nodes.slice(0, waypoints.length).map((node, i) => {
          const wp     = waypoints[i];
          const status: NodeStatus =
            i === 0 ? "completed"
            : i === currentIdx ? "current"
            : node.status === "unlocked" ? "unlocked"
            : "locked";
          const style  = NODE_STYLE[status];

          return (
            <Link
              key={node.lesson_id}
              href={`/lessons/${slug}/${node.lesson_id}`}
              className="absolute flex items-center justify-center rounded-full
                         shadow-lg transition-transform active:scale-95"
              style={{
                left:      `${wp.x}%`,
                top:       `${wp.y}%`,
                transform: "translate(-50%, -50%)",
                width:     style.size,
                height:    style.size,
                backgroundColor: style.bg,
                border:    `3px solid ${style.border}`,
              }}
            >
              <NodeIcon status={status} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
