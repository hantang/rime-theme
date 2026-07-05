import type { ColorFieldMeta, Platform, RimeColorField, RimeTheme, StyleFieldMeta, StyleImportEntry } from "./model";

export const colorFieldMeta: ColorFieldMeta[] = [
  // ── Tier 1（精简模式，两平台通用，顺序即 UI 展示顺序）──
  { id: "backColor", rimeKey: "back_color", labelKey: "config.colorField.back", group: "window", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "borderColor", rimeKey: "border_color", labelKey: "config.colorField.border", group: "window", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "textColor", rimeKey: "text_color", labelKey: "config.colorField.text", group: "preedit", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "hilitedTextColor", rimeKey: "hilited_text_color", labelKey: "config.colorField.highlightText", group: "preedit", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "hilitedBackColor", rimeKey: "hilited_back_color", labelKey: "config.colorField.hilitedBack", group: "preedit", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "candidateTextColor", rimeKey: "candidate_text_color", labelKey: "config.colorField.candidate", group: "candidate", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "commentTextColor", rimeKey: "comment_text_color", labelKey: "config.colorField.comment", group: "candidate", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "labelColor", rimeKey: "label_color", labelKey: "config.colorField.label", group: "candidate", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "hilitedCandidateBackColor", rimeKey: "hilited_candidate_back_color", labelKey: "config.colorField.highlight", group: "highlight", level: "basic", platforms: ["weasel", "squirrel"] },
  { id: "hilitedCandidateTextColor", rimeKey: "hilited_candidate_text_color", labelKey: "config.colorField.hilitedCandidateText", group: "highlight", level: "basic", platforms: ["weasel", "squirrel"] },
  // ── Tier 2 通用 ──
  { id: "candidateBackColor", rimeKey: "candidate_back_color", labelKey: "config.colorField.candidateBack", group: "candidate", level: "advanced", platforms: ["weasel", "squirrel"] },
  { id: "hilitedCommentTextColor", rimeKey: "hilited_comment_text_color", labelKey: "config.colorField.hilitedComment", group: "labels", level: "advanced", platforms: ["weasel", "squirrel"] },
  { id: "hilitedLabel", rimeKey: "hilited_label_color", importKeys: ["hilited_label_color", "hilited_candidate_label_color"], platformKeys: { weasel: "hilited_label_color", squirrel: "hilited_candidate_label_color" }, exportKeys: { squirrel: "hilited_candidate_label_color" }, labelKey: "config.colorField.hilitedLabel", group: "labels", level: "advanced", platforms: ["weasel", "squirrel"] },
  // ── weasel 独有 ──
  { id: "shadowColor", rimeKey: "shadow_color", labelKey: "config.colorField.shadow", group: "window", level: "advanced", platforms: ["weasel"] },
  { id: "hilitedShadowColor", rimeKey: "hilited_shadow_color", labelKey: "config.colorField.hilitedShadow", group: "preedit", level: "advanced", platforms: ["weasel"] },
  { id: "candidateBorderColor", rimeKey: "candidate_border_color", labelKey: "config.colorField.candidateBorder", group: "candidate", level: "advanced", platforms: ["weasel"] },
  { id: "candidateShadowColor", rimeKey: "candidate_shadow_color", labelKey: "config.colorField.candidateShadow", group: "candidate", level: "advanced", platforms: ["weasel"] },
  { id: "hilitedCandidateBorderColor", rimeKey: "hilited_candidate_border_color", labelKey: "config.colorField.hilitedCandidateBorder", group: "highlight", level: "advanced", platforms: ["weasel"] },
  { id: "hilitedCandidateShadowColor", rimeKey: "hilited_candidate_shadow_color", labelKey: "config.colorField.hilitedCandidateShadow", group: "highlight", level: "advanced", platforms: ["weasel"] },
  { id: "hilitedMarkColor", rimeKey: "hilited_mark_color", labelKey: "config.colorField.hilitedMark", group: "navigation", level: "advanced", platforms: ["weasel"] },
  { id: "prevpageColor", rimeKey: "prevpage_color", labelKey: "config.colorField.prevpage", group: "navigation", level: "advanced", platforms: ["weasel"] },
  { id: "nextpageColor", rimeKey: "nextpage_color", labelKey: "config.colorField.nextpage", group: "navigation", level: "advanced", platforms: ["weasel"] },
  // ── squirrel 独有 ──
  { id: "preeditBackColor", rimeKey: "preedit_back_color", labelKey: "config.colorField.preeditBack", group: "preedit", level: "advanced", platforms: ["squirrel"] },
  { id: "accentTextColor", rimeKey: "accent_text_color", labelKey: "config.colorField.accentText", group: "labels", level: "advanced", platforms: ["squirrel"] },
  { id: "warningTextColor", rimeKey: "warning_text_color", labelKey: "config.colorField.warningText", group: "labels", level: "advanced", platforms: ["squirrel"] },
];

export const rimeColorFields = new Set(colorFieldMeta.flatMap((field) => field.importKeys ?? [field.rimeKey]));
export const rimeFieldById = new Map(colorFieldMeta.map((field) => [field.id, field]));

export function colorExportKey(field: ColorFieldMeta, platform: Platform) {
  return field.exportKeys?.[platform] ?? field.rimeKey;
}

// 优先取该平台专属的取值（colorOverrides，仅当源 YAML 同时给出两个平台键名时才存在），否则回退到两平台等价共用的 colors
export function resolveThemeColor(theme: Pick<RimeTheme, "colors" | "colorOverrides">, fieldId: RimeColorField, platform: Platform): string | undefined {
  return theme.colorOverrides?.[platform]?.[fieldId] ?? theme.colors[fieldId];
}

export function getColorFieldGroups(platform: Platform) {
  const supported = colorFieldMeta.filter((field) => field.platforms.includes(platform));
  return {
    basic: supported.filter((field) => field.level === "basic"),
    advanced: supported.filter((field) => field.level === "advanced"),
  };
}

const both: Platform[] = ["weasel", "squirrel"];

export const styleFieldMeta: StyleFieldMeta[] = [
  // ── 布局 ──
  { id: "layoutOrientation", labelKey: "config.styleField.layoutOrientation", group: "layout", level: "basic", platforms: both, type: "enum", enumValues: ["horizontal", "vertical"], exportPaths: { weasel: ["horizontal"], squirrel: ["candidate_list_layout"] }, encode: { weasel: (v) => String(v === "horizontal"), squirrel: (v) => (v === "horizontal" ? "linear" : "stacked") } },
  { id: "textOrientation", labelKey: "config.styleField.textOrientation", group: "layout", level: "advanced", platforms: both, type: "enum", enumValues: ["horizontal", "vertical"], exportPaths: { weasel: ["vertical_text"], squirrel: ["text_orientation"] }, encode: { weasel: (v) => String(v === "vertical") } },
  { id: "cornerRadius", labelKey: "config.styleField.cornerRadius", group: "layout", level: "advanced", platforms: both, type: "number", min: 0, max: 32, exportPaths: { weasel: ["layout/corner_radius"], squirrel: ["corner_radius"] } },
  { id: "hilitedCornerRadius", labelKey: "config.styleField.hilitedCornerRadius", group: "layout", level: "advanced", platforms: both, type: "number", min: 0, max: 32, exportPaths: { weasel: ["layout/round_corner"], squirrel: ["hilited_corner_radius"] } },
  { id: "spacing", labelKey: "config.styleField.spacing", group: "layout", level: "advanced", platforms: both, type: "number", min: -20, max: 60, exportPaths: { weasel: ["layout/spacing"], squirrel: ["spacing"] } },
  { id: "borderThickness", labelKey: "config.styleField.borderThickness", group: "layout", level: "advanced", platforms: both, type: "number", min: -10, max: 20, exportPaths: { weasel: ["layout/border"], squirrel: ["border_width", "border_height"] } },
  { id: "marginX", labelKey: "config.styleField.marginX", group: "layout", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 60, exportPaths: { weasel: ["layout/margin_x"] } },
  { id: "marginY", labelKey: "config.styleField.marginY", group: "layout", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 60, exportPaths: { weasel: ["layout/margin_y"] } },
  { id: "candidateSpacing", labelKey: "config.styleField.candidateSpacing", group: "layout", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 60, exportPaths: { weasel: ["layout/candidate_spacing"] } },
  { id: "hiliteSpacing", labelKey: "config.styleField.hiliteSpacing", group: "layout", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 40, exportPaths: { weasel: ["layout/hilite_spacing"] } },
  { id: "hilitePadding", labelKey: "config.styleField.hilitePadding", group: "layout", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 40, exportPaths: { weasel: ["layout/hilite_padding"] } },
  { id: "minWidth", labelKey: "config.styleField.minWidth", group: "layout", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 800, exportPaths: { weasel: ["layout/min_width"] } },
  { id: "lineSpacing", labelKey: "config.styleField.lineSpacing", group: "layout", level: "advanced", platforms: ["squirrel"], type: "number", min: -20, max: 40, exportPaths: { squirrel: ["line_spacing"] } },
  { id: "linespacingPercent", labelKey: "config.styleField.linespacingPercent", group: "layout", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 300, exportPaths: { weasel: ["layout/linespacing"] } },
  { id: "baselinePercent", labelKey: "config.styleField.baselinePercent", group: "layout", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 300, exportPaths: { weasel: ["layout/baseline"] } },
  { id: "surroundingExtraExpansion", labelKey: "config.styleField.surroundingExtraExpansion", group: "layout", level: "advanced", platforms: ["squirrel"], type: "number", min: -20, max: 20, exportPaths: { squirrel: ["surrounding_extra_expansion"] } },
  // ── 字体 ──
  { id: "fontFace", labelKey: "config.styleField.fontFace", group: "font", level: "basic", platforms: both, type: "string", exportPaths: { weasel: ["font_face"], squirrel: ["font_face"] } },
  { id: "fontPoint", labelKey: "config.styleField.fontPoint", group: "font", level: "basic", platforms: both, type: "number", min: 8, max: 48, exportPaths: { weasel: ["font_point"], squirrel: ["font_point"] } },
  { id: "labelFontFace", labelKey: "config.styleField.labelFontFace", group: "font", level: "advanced", platforms: both, type: "string", exportPaths: { weasel: ["label_font_face"], squirrel: ["label_font_face"] } },
  { id: "labelFontPoint", labelKey: "config.styleField.labelFontPoint", group: "font", level: "advanced", platforms: both, type: "number", min: 8, max: 48, exportPaths: { weasel: ["label_font_point"], squirrel: ["label_font_point"] } },
  { id: "commentFontFace", labelKey: "config.styleField.commentFontFace", group: "font", level: "advanced", platforms: both, type: "string", exportPaths: { weasel: ["comment_font_face"], squirrel: ["comment_font_face"] } },
  { id: "commentFontPoint", labelKey: "config.styleField.commentFontPoint", group: "font", level: "advanced", platforms: both, type: "number", min: 8, max: 48, exportPaths: { weasel: ["comment_font_point"], squirrel: ["comment_font_point"] } },
  // ── 编辑区 ──
  { id: "inlinePreedit", labelKey: "config.styleField.inlinePreedit", group: "preedit", level: "basic", platforms: both, type: "boolean", exportPaths: { weasel: ["inline_preedit"], squirrel: ["inline_preedit"] } },
  { id: "preeditType", labelKey: "config.styleField.preeditType", group: "preedit", level: "advanced", platforms: ["weasel"], type: "enum", enumValues: ["composition", "preview", "preview_all"], exportPaths: { weasel: ["preedit_type"] } },
  { id: "labelFormat", labelKey: "config.styleField.labelFormat", group: "preedit", level: "advanced", platforms: ["weasel"], type: "string", exportPaths: { weasel: ["label_format"] } },
  { id: "markText", labelKey: "config.styleField.markText", group: "preedit", level: "advanced", platforms: ["weasel"], type: "string", exportPaths: { weasel: ["mark_text"] } },
  { id: "inlineCandidate", labelKey: "config.styleField.inlineCandidate", group: "preedit", level: "advanced", platforms: ["squirrel"], type: "boolean", exportPaths: { squirrel: ["inline_candidate"] } },
  { id: "candidateFormat", labelKey: "config.styleField.candidateFormat", group: "preedit", level: "advanced", platforms: ["squirrel"], type: "string", exportPaths: { squirrel: ["candidate_format"] } },
  // ── 效果 ──
  { id: "shadowRadius", labelKey: "config.styleField.shadowRadius", group: "effects", level: "advanced", platforms: ["weasel"], type: "number", min: 0, max: 60, exportPaths: { weasel: ["layout/shadow_radius"] } },
  { id: "shadowOffsetX", labelKey: "config.styleField.shadowOffsetX", group: "effects", level: "advanced", platforms: ["weasel"], type: "number", min: -30, max: 30, exportPaths: { weasel: ["layout/shadow_offset_x"] } },
  { id: "shadowOffsetY", labelKey: "config.styleField.shadowOffsetY", group: "effects", level: "advanced", platforms: ["weasel"], type: "number", min: -30, max: 30, exportPaths: { weasel: ["layout/shadow_offset_y"] } },
  { id: "shadowSize", labelKey: "config.styleField.shadowSize", group: "effects", level: "advanced", platforms: ["squirrel"], type: "number", min: 0, max: 30, exportPaths: { squirrel: ["shadow_size"] } },
  { id: "alpha", labelKey: "config.styleField.alpha", group: "effects", level: "advanced", platforms: ["squirrel"], type: "number", min: 0, max: 1, step: 0.05, exportPaths: { squirrel: ["alpha"] } },
  { id: "translucency", labelKey: "config.styleField.translucency", group: "effects", level: "advanced", platforms: ["squirrel"], type: "boolean", exportPaths: { squirrel: ["translucency"] } },
  { id: "showPaging", labelKey: "config.styleField.showPaging", group: "effects", level: "advanced", platforms: ["squirrel"], type: "boolean", exportPaths: { squirrel: ["show_paging"] } },
  { id: "mutualExclusive", labelKey: "config.styleField.mutualExclusive", group: "effects", level: "advanced", platforms: ["squirrel"], type: "boolean", exportPaths: { squirrel: ["mutual_exclusive"] } },
];

export function getStyleFieldGroups(platform: Platform) {
  const supported = styleFieldMeta.filter((field) => field.platforms.includes(platform));
  return {
    basic: supported.filter((field) => field.level === "basic"),
    advanced: supported.filter((field) => field.level === "advanced"),
  };
}

const parseBool = (v: string) => (v === "true" ? true : v === "false" ? false : undefined);
const parseNum = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const parseText = (v: string) => v;

export const styleImportMap = new Map<string, StyleImportEntry>([
  ["color_scheme", { id: "colorScheme", parse: parseText }],
  ["color_theme", { id: "colorScheme", parse: parseText }],
  ["color_scheme_dark", { id: "colorSchemeDark", parse: parseText }],
  ["color_theme_dark", { id: "colorSchemeDark", parse: parseText }],
  ["horizontal", { id: "layoutOrientation", parse: (v) => (v === "true" ? "horizontal" : v === "false" ? "vertical" : undefined) }],
  ["candidate_list_layout", { id: "layoutOrientation", parse: (v) => (v === "linear" ? "horizontal" : v === "stacked" || v === "stack" ? "vertical" : undefined) }],
  ["vertical_text", { id: "textOrientation", parse: (v) => (v === "true" ? "vertical" : v === "false" ? "horizontal" : undefined) }],
  ["text_orientation", { id: "textOrientation", parse: (v) => (v === "horizontal" || v === "vertical" ? v : undefined) }],
  ["inline_preedit", { id: "inlinePreedit", parse: parseBool }],
  ["font_face", { id: "fontFace", parse: parseText }],
  ["font_point", { id: "fontPoint", parse: parseNum }],
  ["label_font_face", { id: "labelFontFace", parse: parseText }],
  ["label_font_point", { id: "labelFontPoint", parse: parseNum }],
  ["comment_font_face", { id: "commentFontFace", parse: parseText }],
  ["comment_font_point", { id: "commentFontPoint", parse: parseNum }],
  ["corner_radius", { id: "cornerRadius", parse: parseNum }],
  ["round_corner", { id: "hilitedCornerRadius", parse: parseNum }],
  ["hilited_corner_radius", { id: "hilitedCornerRadius", parse: parseNum }],
  ["spacing", { id: "spacing", parse: parseNum }],
  ["border", { id: "borderThickness", parse: parseNum }],
  ["border_width", { id: "borderThickness", parse: parseNum }],
  ["border_height", { id: "borderThickness", parse: parseNum }],
  ["preedit_type", { id: "preeditType", parse: (v) => (v === "composition" || v === "preview" || v === "preview_all" ? v : undefined) }],
  ["label_format", { id: "labelFormat", parse: parseText }],
  ["mark_text", { id: "markText", parse: parseText }],
  ["margin_x", { id: "marginX", parse: parseNum }],
  ["margin_y", { id: "marginY", parse: parseNum }],
  ["candidate_spacing", { id: "candidateSpacing", parse: parseNum }],
  ["hilite_spacing", { id: "hiliteSpacing", parse: parseNum }],
  ["hilite_padding", { id: "hilitePadding", parse: parseNum }],
  ["hilite_padding_x", { id: "hilitePadding", parse: parseNum }],
  ["hilite_padding_y", { id: "hilitePadding", parse: parseNum }],
  ["shadow_radius", { id: "shadowRadius", parse: parseNum }],
  ["shadow_offset_x", { id: "shadowOffsetX", parse: parseNum }],
  ["shadow_offset_y", { id: "shadowOffsetY", parse: parseNum }],
  ["min_width", { id: "minWidth", parse: parseNum }],
  ["linespacing", { id: "linespacingPercent", parse: parseNum }],
  ["baseline", { id: "baselinePercent", parse: parseNum }],
  ["inline_candidate", { id: "inlineCandidate", parse: parseBool }],
  ["candidate_format", { id: "candidateFormat", parse: parseText }],
  ["line_spacing", { id: "lineSpacing", parse: parseNum }],
  ["alpha", { id: "alpha", parse: parseNum }],
  ["translucency", { id: "translucency", parse: parseBool }],
  ["shadow_size", { id: "shadowSize", parse: parseNum }],
  ["surrounding_extra_expansion", { id: "surroundingExtraExpansion", parse: parseNum }],
  ["show_paging", { id: "showPaging", parse: parseBool }],
  ["mutual_exclusive", { id: "mutualExclusive", parse: parseBool }],
]);
