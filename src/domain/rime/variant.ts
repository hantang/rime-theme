import { hslFromHex, hslToHex, normalizeHexColor } from "./color-math";
import { ensureContrast } from "./palette";
import { inferTags, isDarkScheme } from "./tags";
import type { RimeColorField, RimeTheme, RimeThemeColors } from "./model";

export function lightDarkSuffix(id: string): "light" | "dark" | null {
  const match = id.match(/_(light|dark)$/i);
  return match ? (match[1].toLowerCase() as "light" | "dark") : null;
}

export function stripLightDarkSuffix(id: string) {
  return id.replace(/_(light|dark)$/i, "");
}

// spec §6：HSL 亮度翻转，保持色相/饱和度
export function invertColorLightness(hex: string): string {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return hex;
  const hsl = hslFromHex(normalized);
  return hslToHex({ ...hsl, l: 1 - hsl.l });
}

export function invertThemeColors(colors: RimeThemeColors): RimeThemeColors {
  const inverted: RimeThemeColors = {};
  for (const [field, value] of Object.entries(colors) as [RimeColorField, string | undefined][]) {
    // resource-loader 对无 fallback 的可选字段会写入显式 undefined 键
    if (typeof value !== "string") continue;
    inverted[field] = invertColorLightness(value);
  }
  const back = inverted.backColor;
  if (back) {
    if (inverted.textColor) inverted.textColor = ensureContrast(inverted.textColor, back, 4.5);
    if (inverted.candidateTextColor) inverted.candidateTextColor = ensureContrast(inverted.candidateTextColor, back, 4.5);
    if (inverted.commentTextColor) inverted.commentTextColor = ensureContrast(inverted.commentTextColor, back, 3);
  }
  if (inverted.hilitedCandidateBackColor && inverted.hilitedCandidateTextColor) {
    inverted.hilitedCandidateTextColor = ensureContrast(inverted.hilitedCandidateTextColor, inverted.hilitedCandidateBackColor, 4.5);
  }
  if (inverted.hilitedBackColor && inverted.hilitedTextColor) {
    inverted.hilitedTextColor = ensureContrast(inverted.hilitedTextColor, inverted.hilitedBackColor, 4.5);
  }
  return inverted;
}

// 明暗顺序：优先按稳定的 _light/_dark 后缀（不随实时编辑变化），两者都无明确后缀时才按当前颜色亮度兜底
export function orderLightDark(a: RimeTheme, b: RimeTheme): [RimeTheme, RimeTheme] {
  const suffixA = lightDarkSuffix(a.id);
  const suffixB = lightDarkSuffix(b.id);
  if (suffixA && suffixB && suffixA !== suffixB) return suffixA === "light" ? [a, b] : [b, a];
  return isDarkScheme(a.colors) ? [b, a] : [a, b];
}

export type LightDarkPair = { base: RimeTheme; variant: RimeTheme };

// spec §6：基础方案按自身明暗归入 id_light/id_dark，变体取另一后缀；pairId = 基础名
export function createLightDarkPair(theme: RimeTheme, variantNameSuffix: string): LightDarkPair {
  const pairId = stripLightDarkSuffix(theme.id);
  const baseSuffix = lightDarkSuffix(theme.id) ?? (isDarkScheme(theme.colors) ? "dark" : "light");
  const baseId = lightDarkSuffix(theme.id) ? theme.id : `${pairId}_${baseSuffix}`;
  const variantId = `${pairId}_${baseSuffix === "dark" ? "light" : "dark"}`;

  const base = rebadge(theme, baseId, pairId);
  const variant = rebadge(theme, variantId, pairId);
  variant.name = `${theme.name} ${variantNameSuffix}`.trim();
  variant.colors = invertThemeColors(theme.colors);
  variant.tags = inferTags(variant.colors);
  return { base, variant };
}

function rebadge(theme: RimeTheme, id: string, pairId: string): RimeTheme {
  const next = structuredClone(theme);
  next.id = id;
  next.sourceFile = `drafts/${id}.yaml`;
  next.pairId = pairId;
  next.presetColorScheme.id = id;
  return next;
}
