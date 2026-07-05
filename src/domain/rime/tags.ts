import { hslFromHex, luminance } from "./color-math";
import type { RimeThemeColors, StyleTag } from "./model";

// spec §2.3：明暗必须且计算得出，back_color 相对亮度阈值 0.22
export function isDarkScheme(colors: RimeThemeColors): boolean {
  return luminance(colors.backColor ?? "#ffffff") < 0.22;
}

export function inferTags(colors: RimeThemeColors): StyleTag[] {
  const back = colors.backColor ?? "#ffffff";
  const hl = colors.hilitedCandidateBackColor ?? "#333333";

  const backLum = luminance(back);
  const backHsl = hslFromHex(back);
  const hlHsl = hslFromHex(hl);

  const keyHexes = [back, hl, colors.borderColor, colors.textColor, colors.candidateTextColor].filter(
    (c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c),
  );
  const keyHsls = keyHexes.map(hslFromHex);
  const maxSat = Math.max(...keyHsls.map((c) => c.s));
  const avgSat = keyHsls.reduce((sum, c) => sum + c.s, 0) / keyHsls.length;

  const isDark = isDarkScheme(colors);

  // Neutral: all colors near-gray
  if (maxSat < 0.12) return isDark ? ["dark"] : ["neutral"];

  const tags: StyleTag[] = [];
  if (isDark) tags.push("dark");

  // Bright: vivid, saturated highlight
  if (hlHsl.s > 0.65 && hlHsl.l > 0.25) tags.push("bright");

  // Pastel: light background, soft palette
  if (!isDark && backLum > 0.65 && avgSat < 0.38 && maxSat < 0.72) tags.push("pastel");

  // Hue-based tags
  if (hlHsl.s >= 0.10) {
    const h = hlHsl.h;
    // warm: red-orange-yellow (0–74° and 330–360°)
    // cool: green-blue-purple (140–300°)
    const warmHue = h <= 74 || h >= 330;
    const coolHue = h >= 140 && h <= 300;
    // earthy hue: orange through yellow-green (20–95°), excludes pure red
    // earthy feel: warm hue + muted saturation (terracotta, gold, olive, tan)
    const earthyHue = h >= 20 && h <= 95;

    if (warmHue) {
      if (earthyHue && hlHsl.s < 0.72) tags.push("earthy");
      else tags.push("warm");
    } else if (coolHue) {
      tags.push("cool");
    }
  }

  // Monochromatic: consistent hue across saturated colors
  const saturatedHues = keyHsls.filter((c) => c.s >= 0.12).map((c) => c.h);
  if (saturatedHues.length >= 2) {
    const sorted = [...saturatedHues].sort((a, b) => a - b);
    const linSpread = sorted[sorted.length - 1] - sorted[0];
    if (Math.min(linSpread, 360 - linSpread) < 35) tags.push("monochromatic");
  }

  // Complementary: background and highlight have opposite hues
  if (backHsl.s >= 0.10 && hlHsl.s >= 0.10) {
    const diff = Math.abs(backHsl.h - hlHsl.h);
    if (Math.min(diff, 360 - diff) >= 100) tags.push("complementary");
  }

  // Retro: muted warm/earthy tones — non-bright warm palette (vintage aesthetic)
  if (!tags.includes("bright") && (tags.includes("warm") || tags.includes("earthy"))) {
    tags.push("retro");
  }

  return tags;
}
