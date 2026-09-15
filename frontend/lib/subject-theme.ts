import type { CSSProperties } from "react";

const THEMES: Record<string, { color: string; tint: string; ink: string }> = {
  science: { color: "#527f76", tint: "#e4efeb", ink: "#365c53" },
  math: { color: "#996963", tint: "#f3e6e3", ink: "#774b48" },
  english: { color: "#597b96", tint: "#e5ecf3", ink: "#3d5c76" },
};

export function subjectTheme(slug: string): CSSProperties {
  const theme = THEMES[slug] ?? THEMES.science;
  return { "--subject-color": theme.color, "--subject-tint": theme.tint, "--subject-ink": theme.ink } as CSSProperties;
}
