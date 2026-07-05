import sampleSetsData from "@/data/sample-sets.json";
import { hexToRgb, hslFromHex, inferTags, isDarkScheme, lightDarkSuffix, normalizeHexColor, paletteToThemeColors, stripLightDarkSuffix, type RimeTheme, type StyleTag } from "@/domain/rime";

export type Mode = "system" | "light" | "dark";
export type PageStyle = "solid" | "glass" | "swatch";
export type Filter = "all" | StyleTag;
export type ColorFilter = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "pink" | "gray";
export type EditorMode = "visual" | "yaml";
export type PreviewBackground = "default" | "dark" | "transparent";
export type FontFaceMode = "common" | "local";
export type CommonFontCategory = "system" | "heiti" | "kaiti" | "fangsong" | "songti" | "monospace";
export type PresetBrowserView = "grid" | "strips" | "compact";
export type PreviewBoard = "single" | "layout" | "lightDark";
export type ResourceStatus = "loading" | "ready" | "fallback";
export type PaletteCandidate = { id: string; name: string; colors: string[]; source?: "image" | "style" };

export const modeOrder: Mode[] = ["system", "light", "dark"];
export const filters: Filter[] = ["all", "dark", "bright", "cool", "warm", "pastel", "earthy", "neutral", "monochromatic", "complementary", "retro"];

export type SamplePreedit = { prologue: string; highlighted: string; postlude: string };
export type SampleCandidateEntry = { candidate: string; label: string; comment: string };
export type SampleSet = { preedit: SamplePreedit; candidates: SampleCandidateEntry[]; selection: number };
export type SampleSetKey = "chars" | "words" | "sentences" | "mixed";

export const sampleSets = sampleSetsData as Record<SampleSetKey, SampleSet>;

// "本地字体"模式下 Local Font Access API 不可用/未授权时的备用建议列表（常见中日韩/系统界面字体名）
export const fontFaceSuggestions = [] as const;
export const draftsStorageKey = "rime-theme-studio:drafts:v1";

// "常用字体"模式下拉选项——界面只显示分类名，选中后写入的是背后这串逗号级联字体回退栈（Rime font_face 原生支持该写法）
export const commonFontCategories: CommonFontCategory[] = ["system", "heiti", "kaiti", "fangsong", "songti", "monospace"];
export const commonFontStacks: Record<CommonFontCategory, string> = {
  system: "PingFang SC, Microsoft YaHei, Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif",
  heiti: "PingFang SC, Microsoft YaHei, SimHei, Heiti SC, sans-serif",
  kaiti: "Kaiti SC, STKaiti, KaiTi, serif",
  fangsong: "STFangsong, FangSong, FangSong_GB2312, serif",
  songti: "Songti SC, SimSun, Noto Serif CJK SC, serif",
  monospace: "Menlo, Consolas, 'Source Code Pro', monospace",
};

// Local Font Access API（Chromium 专有，需用户手势触发一次性授权）。
// 区分"浏览器不支持"（unsupported，回退到 fontFaceSuggestions，静默即可）
// 和"支持但调用失败"（denied：用户拒绝授权或取消弹窗），后者需要回显给用户，不能悄悄吞掉。
export type LocalFontQueryResult = { ok: true; families: string[] } | { ok: false; reason: "unsupported" | "denied" };

export async function queryLocalFontFamilies(): Promise<LocalFontQueryResult> {
  const api = (window as unknown as { queryLocalFonts?: () => Promise<Array<{ family: string }>> }).queryLocalFonts;
  if (typeof api !== "function") return { ok: false, reason: "unsupported" };
  try {
    const fonts = await api();
    return { ok: true, families: Array.from(new Set(fonts.map((font) => font.family))).sort() };
  } catch (error) {
    console.warn("queryLocalFonts failed (permission denied or dismissed):", error);
    return { ok: false, reason: "denied" };
  }
}

export const colorFilters: Array<{ id: ColorFilter; label: string; color: string; hue: [number, number] | "gray" }> = [
  { id: "red", label: "Red", color: "#ef3b16", hue: [340, 20] },
  { id: "orange", label: "Orange", color: "#f59e0b", hue: [21, 44] },
  { id: "yellow", label: "Yellow", color: "#fde047", hue: [45, 70] },
  { id: "green", label: "Green", color: "#22c55e", hue: [90, 159] },
  { id: "cyan", label: "Cyan", color: "#22c1c8", hue: [160, 199] },
  { id: "blue", label: "Blue", color: "#2563eb", hue: [200, 249] },
  { id: "purple", label: "Purple", color: "#9333ea", hue: [250, 289] },
  { id: "pink", label: "Pink", color: "#ec4899", hue: [290, 339] },
  { id: "gray", label: "Gray", color: "#858585", hue: "gray" },
];

export function themeKey(theme: RimeTheme) {
  return `${theme.sourceFile}:${theme.id}`;
}

// P4 明暗配对启发式（P5 引入 pairId 前）：同基础名 + 显式后缀相反，或兜底计算明暗相反
export function findLightDarkPair(theme: RimeTheme, themes: RimeTheme[]): RimeTheme | null {
  if (theme.pairId) {
    const recorded = themes.find((item) => item.pairId === theme.pairId && themeKey(item) !== themeKey(theme));
    if (recorded) return recorded;
  }
  const base = stripLightDarkSuffix(theme.id);
  const suffix = lightDarkSuffix(theme.id);
  const dark = isDarkScheme(theme.colors);
  return (
    themes.find((item) => {
      if (themeKey(item) === themeKey(theme)) return false;
      if (stripLightDarkSuffix(item.id) !== base) return false;
      const itemSuffix = lightDarkSuffix(item.id);
      if (suffix && itemSuffix) return itemSuffix !== suffix;
      return isDarkScheme(item.colors) !== dark;
    }) ?? null
  );
}

// 与 original 逐字段比对（同一解析路径下键序稳定，序列化相等即未改）
export function isThemeDirty(theme: RimeTheme, original: RimeTheme) {
  return JSON.stringify(theme) !== JSON.stringify(original);
}

// 保存草稿的统一构造：预设名附加草稿标记，已是草稿则原样
export function themeToDraft(theme: RimeTheme, draftTitle: string): RimeTheme {
  const isDraft = theme.sourceFile.startsWith("drafts/");
  return {
    ...structuredClone(theme),
    sourceFile: `drafts/${normalizeSchemeId(theme.id, "theme")}.yaml`,
    name: isDraft ? theme.name : `${theme.name} ${draftTitle}`,
  };
}

export function normalizeSchemeId(value: string, fallback: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || fallback;
}

export function readStoredDrafts() {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(draftsStorageKey);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as RimeTheme[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    window.localStorage.removeItem(draftsStorageKey);
    return [];
  }
}

export function themeMatchesColor(theme: RimeTheme, activeColors: ColorFilter[]) {
  if (activeColors.length === 0) return true;
  const hues = getThemeHueSignals(theme);
  return activeColors.some((id) => {
    const filter = colorFilters.find((item) => item.id === id);
    if (!filter) return false;
    if (filter.hue === "gray") return hues.some((hue) => hue.s < 0.12);
    const [start, end] = filter.hue;
    return hues.some((hue) => {
      if (hue.s < 0.12) return false;
      return start <= end ? hue.h >= start && hue.h <= end : hue.h >= start || hue.h <= end;
    });
  });
}


export function pickDistinctPaletteColors(colors: string[], limit = 5) {
  const picked: string[] = [];
  for (const color of colors) {
    const normalized = normalizeHexColor(color);
    if (!normalized) continue;
    if (picked.every((item) => colorDistance(item, normalized) >= 18)) picked.push(normalized);
    if (picked.length >= limit) break;
  }
  return picked;
}

export function createThemeFromPalette(candidate: PaletteCandidate): RimeTheme {
  const colors = paletteToThemeColors(candidate.colors);
  const id = normalizeSchemeId(`palette_${candidate.id}`, "palette_theme");
  return {
    id,
    name: candidate.name,
    author: "Rime Theme Studio",
    sourceFile: `drafts/${id}.yaml`,
    tags: inferTags(colors),
    presetColorScheme: { id, name: candidate.name, author: "Rime Theme Studio" },
    style: {},
    colors,
    rawValues: {},
    options: {},
  };
}

function getThemeHueSignals(theme: RimeTheme) {
  return [
    theme.colors.backColor,
    theme.colors.hilitedCandidateBackColor,
    theme.colors.hilitedBackColor,
    theme.colors.borderColor,
    theme.colors.textColor,
    theme.colors.candidateTextColor,
    theme.colors.commentTextColor,
  ]
    .map((color) => (color ? hslFromHex(color) : null))
    .filter((value): value is { h: number; s: number; l: number } => Boolean(value));
}

function colorDistance(first: string, second: string) {
  const a = normalizeHexColor(first);
  const b = normalizeHexColor(second);
  if (!a || !b) return 255;
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}
