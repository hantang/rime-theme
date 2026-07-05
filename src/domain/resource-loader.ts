import { parse as parseYamlScalar } from "yaml";
import { withBasePath } from "./base-path";
import {
  colorFieldMeta,
  rimeColorFields,
  rimeColorToCssHex as convertRimeColorToCssHex,
  cssHexToRimeColor as convertCssHexToRimeColor,
  inferTags,
  styleImportMap,
  type Platform,
  type RimeColorField,
  type RimeColorFormat,
  type RimeStyleControls,
  type RimeTheme,
  type RimeThemeColors,
} from "./rime";

type RawTheme = {
  id: string;
  name?: string;
  author?: string;
  values: Partial<Record<string, string>>;
  fieldIndent: number;
};

export type YamlWarning = { line: number; kind: "unparsed" | "badValue"; key?: string };

const COLOR_SHAPE = /^(0x[0-9a-fA-F]{6,8}|#[0-9a-fA-F]{6})$/;

type ParserSection = "root" | "patch" | "preset" | "style";

const SAFE_KEY = /^[A-Za-z0-9_-]+$/;

const colorMap = Object.fromEntries(colorFieldMeta.map((field) => [field.id, field.importKeys ?? [field.rimeKey]])) as Record<RimeColorField, string[]>;

const fallbackColors: RimeThemeColors = {
  backColor: "#ffffff",
  borderColor: "#111111",
  textColor: "#555555",
  hilitedTextColor: "#333333",
  candidateTextColor: "#111111",
  hilitedCandidateBackColor: "#333333",
  hilitedCandidateTextColor: "#ffffff",
  commentTextColor: "#777777",
};

// themes.json is generated at build time by scripts/build-themes.mts (parses every
// data/resources/*.yaml once, ahead of time) — a single fetch instead of one
// request + client-side parse per theme file.
export async function loadIndexedThemes(): Promise<RimeTheme[]> {
  const response = await fetch(withBasePath("/resources/themes.json"));
  if (!response.ok) throw new Error(`Resource bundle failed: ${response.status}`);
  const themes = await response.json();
  if (!Array.isArray(themes)) throw new Error("Resource bundle must be an array");
  return themes as RimeTheme[];
}

export function parseThemeYaml(source: string, sourceFile: string, warnings?: YamlWarning[]): RimeTheme[] {
  const rawThemes: RawTheme[] = [];
  const styleValues: Partial<Record<string, string>> = Object.create(null);
  let current: RawTheme | null = null;
  let section: ParserSection = "root";
  let styleReturnSection: Exclude<ParserSection, "style"> = "root";
  let styleIndent = 0;

  const sourceLines = source.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < sourceLines.length; lineIndex++) {
    const originalLine = sourceLines[lineIndex];
    const lineNumber = lineIndex + 1;
    const line = stripComment(originalLine);
    if (!line.trim()) continue;

    const parsed = parseYamlLine(line);
    if (!parsed) {
      warnings?.push({ line: lineNumber, kind: "unparsed" });
      continue;
    }

    if (section === "style" && parsed.indent < styleIndent) {
      section = styleReturnSection;
    }

    if (parsed.indent === 0 && parsed.key === "patch") {
      section = "patch";
      current = null;
      continue;
    }

    if (parsed.indent === 0 && parsed.key === "preset_color_schemes") {
      section = "preset";
      current = null;
      continue;
    }

    if (parsed.indent === 0 && parsed.key === "style" && isMapping(parsed.value)) {
      section = "style";
      styleReturnSection = "root";
      styleIndent = parsed.indent + 2;
      current = null;
      continue;
    }

    if (section === "patch" && parsed.key === "style/+" && isMapping(parsed.value)) {
      section = "style";
      styleReturnSection = "patch";
      styleIndent = parsed.indent + 2;
      current = null;
      continue;
    }

    if (section === "style" && parsed.indent >= styleIndent) {
      if (isMapping(parsed.value)) continue;
      const styleKey = parsed.key;
      if (isAllowedStyleKey(styleKey)) {
        const rawValue = unquote(parsed.value);
        styleValues[styleKey] = rawValue;
        const entry = styleImportMap.get(styleKey);
        if (entry && rawValue.trim() !== "" && entry.parse(cleanText(rawValue)) === undefined) {
          warnings?.push({ line: lineNumber, kind: "badValue", key: styleKey });
        }
      }
      continue;
    }

    const patchThemeId = parsed.key.match(/^preset_color_schemes\/([A-Za-z0-9_-]+)$/)?.[1];
    if (section === "patch" && patchThemeId && isMapping(parsed.value)) {
      current = startTheme(rawThemes, patchThemeId, parsed.indent + 2);
      continue;
    }

    if (section === "preset" && parsed.indent === 2 && SAFE_KEY.test(parsed.key) && isMapping(parsed.value)) {
      current = startTheme(rawThemes, parsed.key, parsed.indent + 2);
      continue;
    }

    if (!current && parsed.indent === 0 && isThemeField(parsed.key) && !isMapping(parsed.value)) {
      current = startTheme(rawThemes, idFromSourceFile(sourceFile), 0);
    }

    if (!current || parsed.indent < current.fieldIndent || isMapping(parsed.value)) continue;
    const fieldValue = unquote(parsed.value);
    applyThemeField(current, parsed.key, fieldValue);
    if (rimeColorFields.has(parsed.key) && fieldValue.trim() !== "" && !COLOR_SHAPE.test(fieldValue)) {
      warnings?.push({ line: lineNumber, kind: "badValue", key: parsed.key });
    }
  }

  return rawThemes.map((raw) => normalizeRawTheme(raw, sourceFile, normalizeStyle(styleValues)));
}

export function rimeColorToCssHex(value: string | undefined) {
  return convertRimeColorToCssHex(value);
}

export function cssHexToRimeColor(value: string) {
  return convertCssHexToRimeColor(value);
}

function normalizeRawTheme(raw: RawTheme, sourceFile: string, style: RimeStyleControls): RimeTheme {
  const colorFormat = normalizeColorFormat(raw.values.color_format);
  const colors = { ...fallbackColors };
  for (const [target, sourceKeys] of Object.entries(colorMap) as Array<[keyof RimeThemeColors, string[]]>) {
    const found = sourceKeys.map((key) => raw.values[key]).find(Boolean);
    const resolved = normalizeColor(found, colorFormat) ?? fallbackColors[target];
    // 无来源值也无 fallback 的可选字段（如 labelColor）保持缺失键，不写入显式 undefined
    if (resolved !== undefined) colors[target] = resolved;
  }
  const id = raw.id;
  const name = cleanText(raw.name) || raw.id;
  const author = cleanText(raw.author) || "unknown";
  const colorOverrides = resolveColorOverrides(raw.values, colorFormat);

  return {
    id,
    name,
    author,
    sourceFile,
    tags: inferTags(colors),
    presetColorScheme: {
      id,
      name,
      author,
      colorFormat,
    },
    style: { ...style, ...normalizeStyle(raw.values) },
    colors,
    ...(colorOverrides ? { colorOverrides } : {}),
    rawValues: compactValues(raw.values),
    options: {
      colorSpace: raw.values.color_space,
    },
  };
}

// 仅当某字段的两个平台键名（如 hilited_label_color / hilited_candidate_label_color）在源 YAML 中同时出现时，
// 才认为作者刻意为两平台分别设色，各自保留；只出现一个键名时视为两平台等价，继续沿用上面统一解析出的 colors
function resolveColorOverrides(values: Partial<Record<string, string>>, colorFormat: RimeColorFormat | undefined): Partial<Record<Platform, Partial<RimeThemeColors>>> | undefined {
  const overrides: Partial<Record<Platform, Partial<RimeThemeColors>>> = {};
  for (const field of colorFieldMeta) {
    if (!field.platformKeys) continue;
    const present = (Object.entries(field.platformKeys) as Array<[Platform, string]>).filter(([, key]) => values[key] !== undefined);
    if (present.length < 2) continue;
    for (const [platform, key] of present) {
      const resolved = normalizeColor(values[key], colorFormat);
      if (resolved == null) continue;
      (overrides[platform] ??= {})[field.id] = resolved;
    }
  }
  return Object.keys(overrides).length ? overrides : undefined;
}

function compactValues(values: Partial<Record<string, string>>) {
  return Object.fromEntries(Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

function startTheme(rawThemes: RawTheme[], id: string, fieldIndent: number) {
  const theme = { id, values: Object.create(null) as Partial<Record<string, string>>, fieldIndent };
  rawThemes.push(theme);
  return theme;
}

function applyThemeField(theme: RawTheme, key: string, value: string) {
  if (key === "name") theme.name = value;
  if (key === "author") theme.author = value;
  if (key === "name" || key === "author") return;
  if (SAFE_KEY.test(key)) theme.values[key] = value.slice(0, 200);
}

function parseYamlLine(line: string) {
  const indent = line.match(/^\s*/)?.[0].length ?? 0;
  const trimmed = line.trim();
  const match = trimmed.match(/^(?:"([^"]+)"|'([^']+)'|([^:]+))\s*:\s*(.*?)\s*$/);
  if (!match) return null;
  return {
    indent,
    key: (match[1] ?? match[2] ?? match[3] ?? "").trim(),
    value: match[4] ?? "",
  };
}

function isMapping(value: string) {
  return value.trim() === "";
}

function isThemeField(key: string) {
  return key === "name" || key === "author" || key === "color_format" || key === "color_space" || rimeColorFields.has(key) || styleImportMap.has(key);
}

function idFromSourceFile(sourceFile: string) {
  const fileName = sourceFile.split("/").pop() ?? "theme";
  return fileName.replace(/\.ya?ml$/i, "").replace(/[^A-Za-z0-9_-]/g, "_") || "theme";
}

function stripComment(line: string) {
  const hashIndex = line.indexOf("#");
  if (hashIndex === -1) return line;
  const before = line.slice(0, hashIndex);
  const quoteCount = (before.match(/"/g) ?? []).length + (before.match(/'/g) ?? []).length;
  return quoteCount % 2 === 0 ? before : line;
}

function unquote(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.length >= 2 && trimmed.endsWith(quote)) {
    try {
      const parsed = parseYamlScalar(trimmed);
      if (typeof parsed === "string") return parsed;
    } catch {
      // 非法转义时回退到朴素剥引号
    }
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

function cleanText(value: string | undefined) {
  return (value ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 80);
}

function normalizeColor(value: string | undefined, format: RimeColorFormat = "abgr") {
  const rime = convertRimeColorToCssHex(value, format);
  if (rime) return rime;

  const raw = value?.trim() ?? "";
  const css = raw.match(/^#([0-9a-fA-F]{6})$/);
  return css ? `#${css[1].toLowerCase()}` : null;
}

function normalizeColorFormat(value: string | undefined): RimeColorFormat | undefined {
  const format = value?.trim().toLowerCase();
  return format === "argb" || format === "rgba" || format === "abgr" ? format : undefined;
}

function isAllowedStyleKey(key: string) {
  return styleImportMap.has(key);
}

function normalizeStyle(values: Partial<Record<string, string>>): RimeStyleControls {
  const style: RimeStyleControls = {};
  for (const [rawKey, rawValue] of Object.entries(values)) {
    const entry = styleImportMap.get(rawKey);
    if (!entry || rawValue === undefined) continue;
    const value = entry.parse(cleanText(rawValue));
    if (value !== undefined) Object.assign(style, { [entry.id]: value });
  }
  return style;
}

