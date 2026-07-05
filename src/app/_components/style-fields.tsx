import type { Platform, RimeStyleControls, StyleFieldMeta } from "@/domain/rime";
import type { MessageKey, makeTranslator } from "@/i18n/messages";
import { commonFontCategories, commonFontStacks, fontFaceSuggestions, type CommonFontCategory, type FontFaceMode } from "../_lib/workbench";
import { FieldLabelBlock, RangeField, Segmented, SelectField, TextField } from "./controls";

type Translator = ReturnType<typeof makeTranslator>;
export type StyleValue = string | number | boolean | undefined;
export type UpdateStyle = (key: keyof RimeStyleControls, value: StyleValue) => void;

const FONT_FACE_FIELD_IDS = new Set(["fontFace", "labelFontFace", "commentFontFace"]);

const fontCategoryLabelKey: Record<CommonFontCategory, MessageKey> = {
  system: "config.styleField.placeholderSystem",
  heiti: "config.styleField.fontCategoryHeiti",
  kaiti: "config.styleField.fontCategoryKaiti",
  fangsong: "config.styleField.fontCategoryFangsong",
  songti: "config.styleField.fontCategorySongti",
  monospace: "config.styleField.fontCategoryMonospace",
};

function fieldLabel(field: StyleFieldMeta, platform: Platform, t: Translator) {
  if (field.labelKey) return t(field.labelKey);
  return (field.exportPaths[platform]?.[0] ?? field.id).replace("layout/", "");
}

// 原始 rime key 副标题，和颜色字段（FieldGroup）的双行展示保持一致
function rawKeyFor(field: StyleFieldMeta, platform: Platform): string | undefined {
  return field.exportPaths[platform]?.[0];
}

// layoutOrientation 的取值语义是 linear/stacked（候选排列方式），与 textOrientation 的横竖排书写方向是两条独立轴，标签不能共用
function enumItemLabel(fieldId: StyleFieldMeta["id"], value: string, t: Translator): string {
  if (fieldId === "layoutOrientation") {
    if (value === "horizontal") return t("config.styleField.layoutLinear");
    if (value === "vertical") return t("config.styleField.layoutStacked");
  }
  if (value === "horizontal") return t("config.styleField.orientation.horizontal");
  if (value === "vertical") return t("config.styleField.orientation.vertical");
  return value;
}

// 展示性默认值提示，取自 docs/v2/{weasel,squirrel}-fields-reference.yaml；不写入导出，仅帮助理解未设置时 Rime 实际采用的值
function stringPlaceholder(field: StyleFieldMeta): string | undefined {
  switch (field.id) {
    case "labelFormat":
      return "%s.";
    case "candidateFormat":
      return "[label]. [candidate] [comment]";
    default:
      return undefined;
  }
}

function numberDefaultHint(field: StyleFieldMeta, platform: Platform, style: RimeStyleControls, t: Translator): string | undefined {
  const fallbackFontPoint = typeof style.fontPoint === "number" ? String(style.fontPoint) : undefined;
  if (field.id === "fontPoint") return platform === "weasel" ? "12" : t("config.styleField.placeholderSystem");
  if (field.id === "labelFontPoint" || field.id === "commentFontPoint") {
    return fallbackFontPoint ?? (platform === "weasel" ? "12" : t("config.styleField.placeholderSystem"));
  }
  return undefined;
}

// 常用字体：下拉只显示分类名，选中后写入的是背后真实的逗号级联字体栈；本地字体：下拉显示真实已装字体名
function FontFaceSelect({ field, value, label, rawKey, fontFaceMode, localFonts, t, updateStyle }: { field: StyleFieldMeta; value: StyleValue; label: string; rawKey?: string; fontFaceMode: FontFaceMode; localFonts: string[] | null; t: Translator; updateStyle: UpdateStyle }) {
  const current = typeof value === "string" ? value : "";
  const options: Array<[string, string]> =
    fontFaceMode === "common"
      ? commonFontCategories.map((category) => [commonFontStacks[category], t(fontCategoryLabelKey[category])])
      : (localFonts ?? fontFaceSuggestions.slice()).map((name) => [name, name]);
  const knownValues = new Set(options.map(([optionValue]) => optionValue));
  const items: Array<[string, string]> = [
    ["", t("ui.common.unset")],
    ...(current !== "" && !knownValues.has(current) ? [[current, current] as [string, string]] : []),
    ...options,
  ];
  return <SelectField label={label} rawKey={rawKey} value={current} items={items} onChange={(next) => updateStyle(field.id, next === "" ? undefined : next)} />;
}

export function StyleFieldControl({ field, value, style, platform, t, updateStyle, fontFaceMode, localFonts }: { field: StyleFieldMeta; value: StyleValue; style: RimeStyleControls; platform: Platform; t: Translator; updateStyle: UpdateStyle; fontFaceMode: FontFaceMode; localFonts: string[] | null }) {
  const label = fieldLabel(field, platform, t);
  const rawKey = rawKeyFor(field, platform);

  if (FONT_FACE_FIELD_IDS.has(field.id)) {
    return <FontFaceSelect field={field} value={value} label={label} rawKey={rawKey} fontFaceMode={fontFaceMode} localFonts={localFonts} t={t} updateStyle={updateStyle} />;
  }

  if (field.type === "boolean") {
    return (
      <div className="flex min-h-8 items-center justify-between gap-3">
        <FieldLabelBlock label={label} rawKey={rawKey} />
        <Segmented items={[["on", t("ui.common.on")], ["off", t("ui.common.off")]]} value={value === true ? "on" : "off"} onChange={(id) => updateStyle(field.id, id === "on")} />
      </div>
    );
  }

  if (field.type === "enum") {
    return (
      <div className="flex min-h-8 items-center justify-between gap-3">
        <FieldLabelBlock label={label} rawKey={rawKey} />
        <Segmented items={(field.enumValues ?? []).map((item) => [item, enumItemLabel(field.id, item, t)] as [string, string])} value={typeof value === "string" ? value : ""} onChange={(id) => updateStyle(field.id, id)} />
      </div>
    );
  }

  if (field.type === "number") {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    // 未设置时不展示 min（对负 min 字段会显得已钉在最小值），取夹在范围内最接近 0 的中性值
    const unsetValue = Math.min(max, Math.max(min, 0));
    const defaultHint = numberDefaultHint(field, platform, style, t);
    const labelWithHint = value === undefined && defaultHint ? `${label} (${defaultHint})` : label;
    return <RangeField label={labelWithHint} rawKey={rawKey} value={typeof value === "number" ? value : unsetValue} min={min} max={max} step={field.step} onChange={(next) => updateStyle(field.id, next)} />;
  }

  return <TextField label={label} rawKey={rawKey} value={typeof value === "string" ? value : ""} onChange={(next) => updateStyle(field.id, next.trim() === "" ? undefined : next)} placeholder={stringPlaceholder(field)} />;
}

export function StyleFieldList({
  fields,
  style,
  platform,
  t,
  updateStyle,
  fontFaceMode,
  setFontFaceMode,
  localFonts,
  localFontsError,
  loadLocalFonts,
}: {
  fields: StyleFieldMeta[];
  style: RimeStyleControls;
  platform: Platform;
  t: Translator;
  updateStyle: UpdateStyle;
  fontFaceMode: FontFaceMode;
  setFontFaceMode: (mode: FontFaceMode) => void;
  localFonts: string[] | null;
  localFontsError: boolean;
  loadLocalFonts: () => void;
}) {
  const hasFontFaceField = fields.some((field) => FONT_FACE_FIELD_IDS.has(field.id));
  const supportsLocalFonts = typeof window !== "undefined" && typeof (window as unknown as { queryLocalFonts?: unknown }).queryLocalFonts === "function";
  return (
    <div className="grid gap-2">
      {hasFontFaceField ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("config.styleField.fontMode")}</span>
          <div className="flex items-center gap-2">
            <Segmented items={[["common", t("config.styleField.fontModeCommon")], ["local", t("config.styleField.fontModeLocal")]]} value={fontFaceMode} onChange={(value) => setFontFaceMode(value as FontFaceMode)} />
            {fontFaceMode === "local" && supportsLocalFonts ? (
              <button type="button" onClick={loadLocalFonts} className="h-8 whitespace-nowrap rounded-full bg-[var(--soft)] px-3 text-[11px] font-bold">{t("config.styleField.scanLocalFonts")}</button>
            ) : null}
          </div>
        </div>
      ) : null}
      {hasFontFaceField && fontFaceMode === "local" && !supportsLocalFonts ? (
        <div className="text-[10px] font-bold text-[var(--muted)]">{t("config.styleField.localFontsUnavailable")}</div>
      ) : null}
      {hasFontFaceField && fontFaceMode === "local" && supportsLocalFonts && localFontsError ? (
        <div className="text-[10px] font-bold text-red-500">{t("config.styleField.localFontsScanFailed")}</div>
      ) : null}
      {fields.map((field) => (
        <StyleFieldControl key={field.id} field={field} value={style[field.id]} style={style} platform={platform} t={t} updateStyle={updateStyle} fontFaceMode={fontFaceMode} localFonts={localFonts} />
      ))}
    </div>
  );
}
