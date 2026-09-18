import type { MathInteraction } from "./api/schema";

export type Placements = Record<string, string>;

export function readPlacements(answer: string): Placements {
  try {
    const data = JSON.parse(answer);
    if (data && typeof data === "object" && !Array.isArray(data)
      && Object.values(data).every((value) => typeof value === "string")) return data;
  } catch { /* A previous free-text draft is not a placement. */ }
  return {};
}

/** Moving an existing single-use card swaps occupied slots or vacates its old slot. */
export function placeToken(current: Placements, target: string, token: string, reusable: boolean): Placements {
  const next = { ...current };
  if (!reusable) {
    const previous = Object.keys(next).find((key) => next[key] === token);
    if (previous && previous !== target) {
      if (next[target]) next[previous] = next[target];
      else delete next[previous];
    }
  }
  next[target] = token;
  return next;
}

export function interactionComplete(interaction: MathInteraction | null | undefined, answer: string): boolean {
  if (!interaction) return !!answer.trim();
  const values = readPlacements(answer);
  return interaction.slots!.every((slot) => !!values[slot.id]?.trim());
}

export function describeMathAnswer(interaction: MathInteraction | null | undefined, answer: string): string {
  if (!interaction || !answer.startsWith("{")) return answer;
  const values = readPlacements(answer);
  return interaction.slots!.map((slot) => {
    const value = values[slot.id];
    let label = interaction.tokens?.find((token) => token.id === value)?.label ?? value ?? "—";
    if (interaction.kind === "mark_digits" && value !== undefined) {
      const digits = interaction.number?.replace(/,/g, "") ?? "";
      label = `${digits[Number(value)] ?? "—"} · position ${Number(value) + 1}`;
    }
    return `${slot.label}: ${label}`;
  }).join("\n");
}
