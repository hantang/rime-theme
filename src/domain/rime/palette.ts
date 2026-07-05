import { contrastRatio, desaturate, hslFromHex, mixHex, normalizeHexColor, relativeLuminance } from "./color-math";
import type { RimeThemeColors } from "./model";

const fallbackRoles = { back: "#f7f8fa", text: "#26282e", accent: "#3b6fe0" };

export function paletteToThemeColors(rawColors: string[]): RimeThemeColors {
  const pool: string[] = [];
  for (const raw of rawColors) {
    const hex = normalizeHexColor(raw);
    if (hex && !pool.includes(hex)) pool.push(hex);
  }

  const back = takeBest(pool, (hex) => relativeLuminance(hex) - 0.3 * hslFromHex(hex).s) ?? fallbackRoles.back;
  const text = ensureContrast(takeBest(pool, (hex) => contrastRatio(hex, back)) ?? fallbackRoles.text, back, 4.5);
  const accent = takeBest(pool, (hex) => hslFromHex(hex).s) ?? fallbackRoles.accent;

  const midLum = (relativeLuminance(back) + relativeLuminance(text)) / 2;
  const commentBase = takeBest(pool, (hex) => -Math.abs(relativeLuminance(hex) - midLum)) ?? mixHex(text, back, 0.5);
  const comment = ensureContrast(commentBase, back, 3, text);

  const border = pool.length > 0 ? desaturate(pool[0], 0.5) : back;
  const accentText = contrastRatio("#ffffff", accent) >= contrastRatio("#1a1a1a", accent) ? "#ffffff" : "#1a1a1a";

  return {
    backColor: back,
    textColor: text,
    candidateTextColor: text,
    commentTextColor: comment,
    borderColor: border,
    hilitedCandidateBackColor: accent,
    hilitedCandidateTextColor: accentText,
  };
}

// 取分数最高者并从池中移除
function takeBest(pool: string[], score: (hex: string) => number): string | null {
  if (pool.length === 0) return null;
  let best = 0;
  for (let i = 1; i < pool.length; i += 1) if (score(pool[i]) > score(pool[best])) best = i;
  return pool.splice(best, 1)[0];
}

// 不达标时逐步向锚点色混合；toward 未指定时按背景明暗选黑/白
export function ensureContrast(color: string, against: string, target: number, toward?: string): string {
  const anchor = toward ?? (relativeLuminance(against) > 0.5 ? "#000000" : "#ffffff");
  let current = color;
  for (let i = 0; i < 12 && contrastRatio(current, against) < target; i += 1) {
    current = mixHex(current, anchor, 0.15);
  }
  return current;
}
