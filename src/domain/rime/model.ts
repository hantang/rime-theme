import type { MessageKey } from "@/i18n/messages";

export type Platform = "weasel" | "squirrel";
export type PreviewLayout = "horizontal" | "vertical";
export type RimeColorFormat = "abgr" | "argb" | "rgba";

export type RimeColorField =
  | "backColor"
  | "borderColor"
  | "shadowColor"
  | "textColor"
  | "preeditBackColor"
  | "hilitedTextColor"
  | "hilitedBackColor"
  | "hilitedShadowColor"
  | "candidateTextColor"
  | "candidateBackColor"
  | "candidateBorderColor"
  | "candidateShadowColor"
  | "hilitedCandidateTextColor"
  | "hilitedCandidateBackColor"
  | "hilitedCandidateBorderColor"
  | "hilitedCandidateShadowColor"
  | "labelColor"
  | "commentTextColor"
  | "hilitedLabel"
  | "accentTextColor"
  | "warningTextColor"
  | "hilitedCommentTextColor"
  | "hilitedMarkColor"
  | "nextpageColor"
  | "prevpageColor";

export type RimeThemeColors = Partial<Record<RimeColorField, string>>;

export type RimePresetColorScheme = {
  id: string;
  name: string;
  author: string;
  colorFormat?: RimeColorFormat;
};

export type RimeStyleControls = {
  colorScheme?: string;
  colorSchemeDark?: string;
  // ── 通用（一个逻辑字段，按平台导出不同 key）──
  layoutOrientation?: "horizontal" | "vertical";
  textOrientation?: "horizontal" | "vertical";
  inlinePreedit?: boolean;
  fontFace?: string;
  fontPoint?: number;
  labelFontFace?: string;
  labelFontPoint?: number;
  commentFontFace?: string;
  commentFontPoint?: number;
  cornerRadius?: number;
  hilitedCornerRadius?: number;
  spacing?: number;
  borderThickness?: number;
  // ── weasel 专属 ──
  preeditType?: "composition" | "preview" | "preview_all";
  labelFormat?: string;
  markText?: string;
  marginX?: number;
  marginY?: number;
  candidateSpacing?: number;
  hiliteSpacing?: number;
  hilitePadding?: number;
  shadowRadius?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  minWidth?: number;
  linespacingPercent?: number;
  baselinePercent?: number;
  // ── squirrel 专属 ──
  inlineCandidate?: boolean;
  candidateFormat?: string;
  lineSpacing?: number;
  alpha?: number;
  translucency?: boolean;
  shadowSize?: number;
  surroundingExtraExpansion?: number;
  showPaging?: boolean;
  mutualExclusive?: boolean;
};

export type StyleTag = "bright" | "complementary" | "cool" | "dark" | "earthy" | "monochromatic" | "neutral" | "pastel" | "retro" | "warm";

export type RimeTheme = {
  id: string;
  name: string;
  author: string;
  sourceFile: string;
  tags: StyleTag[];
  presetColorScheme: RimePresetColorScheme;
  style: RimeStyleControls;
  colors: RimeThemeColors;
  // 仅当某逻辑字段在源 YAML 中同时提供了两个平台各自的键名（如 hilited_label_color 与
  // hilited_candidate_label_color）时才写入，用于保留两平台各自的取值；否则视为等价，回退到 colors
  colorOverrides?: Partial<Record<Platform, Partial<RimeThemeColors>>>;
  pairId?: string;
  rawValues: Record<string, string>;
  options: {
    colorSpace?: string;
  };
};

export type StyleFieldType = "boolean" | "number" | "enum" | "string";

export type StyleFieldMeta = {
  id: keyof RimeStyleControls;
  labelKey?: MessageKey;
  group: "layout" | "font" | "preedit" | "effects";
  level: "basic" | "advanced";
  platforms: Platform[];
  type: StyleFieldType;
  enumValues?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
  exportPaths: Partial<Record<Platform, string[]>>;
  encode?: Partial<Record<Platform, (value: string | number | boolean) => string>>;
};

export type StyleImportEntry = {
  id: keyof RimeStyleControls;
  parse: (raw: string) => string | number | boolean | undefined;
};

export type ColorFieldMeta = {
  id: RimeColorField;
  rimeKey: string;
  importKeys?: string[];
  exportKeys?: Partial<Record<Platform, string>>;
  // 该字段在源 YAML 里按平台对应的键名；解析时若两个键同时出现，则各平台各自取值（见 RimeTheme.colorOverrides）
  platformKeys?: Partial<Record<Platform, string>>;
  labelKey?: MessageKey;
  group: "window" | "preedit" | "candidate" | "highlight" | "labels" | "navigation";
  level: "basic" | "advanced";
  platforms: Platform[];
};
