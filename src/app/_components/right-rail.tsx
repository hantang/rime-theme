import { useState } from "react";
import type { Platform, RimeColorField, RimeColorFormat, RimeTheme } from "@/domain/rime";
import { colorFieldMeta, getColorFieldGroups, getStyleFieldGroups } from "@/domain/rime";
import type { YamlWarning } from "@/domain/resource-loader";
import type { makeTranslator } from "@/i18n/messages";
import { Collapsible, FieldGroup, Segmented, SelectField, TextField } from "./controls";
import { StyleFieldList, type UpdateStyle } from "./style-fields";
import type { EditorMode, FontFaceMode } from "../_lib/workbench";

type Translator = ReturnType<typeof makeTranslator>;
export type FieldMode = "simple" | "full";

const colorGroupOrder = ["window", "preedit", "candidate", "highlight", "labels", "navigation"] as const;
const styleGroupOrder = ["layout", "font", "preedit", "effects"] as const;
const groupLabelKey = {
  window: "config.group.window",
  preedit: "config.group.preedit",
  candidate: "config.group.candidate",
  highlight: "config.group.highlight",
  labels: "config.group.labels",
  navigation: "config.group.navigation",
  layout: "config.group.layout",
  font: "config.group.font",
  effects: "config.group.effects",
} as const;

export function RightRail(props: {
  t: Translator;
  theme: RimeTheme;
  platform: Platform;
  fieldMode: FieldMode;
  setFieldMode: (mode: FieldMode) => void;
  updateMeta: (field: "id" | "name" | "author", value: string) => void;
  updateColorFormat: (value: RimeColorFormat | "") => void;
  updateColorSpace: (value: string) => void;
  editorMode: EditorMode;
  setEditorMode: (mode: EditorMode) => void;
  yamlText: string;
  setYamlText: (value: string) => void;
  yamlError: string | null;
  yamlWarnings: YamlWarning[];
  updateColor: (field: RimeColorField, value: string) => void;
  updateStyle: UpdateStyle;
  copyYaml: () => Promise<boolean>;
  downloadYaml: () => void;
  uploadYaml: (file: File | null) => void;
  resetTheme: () => void;
  saveDraft: () => void;
  generateVariant: () => void;
  open: boolean;
  fontFaceMode: FontFaceMode;
  setFontFaceMode: (mode: FontFaceMode) => void;
  localFonts: string[] | null;
  localFontsError: boolean;
  loadLocalFonts: () => void;
}) {
  const { t, theme, platform, fieldMode, setFieldMode, updateMeta, updateColorFormat, updateColorSpace, editorMode, setEditorMode, yamlText, setYamlText, yamlError, yamlWarnings, updateColor, updateStyle, copyYaml, downloadYaml, uploadYaml, resetTheme, saveDraft, generateVariant, open, fontFaceMode, setFontFaceMode, localFonts, localFontsError, loadLocalFonts } = props;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ meta: true, colors: true, style: true });
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const [fieldQuery, setFieldQuery] = useState("");
  const toggleSection = (key: string) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));

  const query = fieldQuery.trim().toLowerCase();
  const matchesQuery = (label: string, rimeKeys: string[]) =>
    query === "" || label.toLowerCase().includes(query) || rimeKeys.some((key) => key.toLowerCase().includes(query));

  async function handleCopy() {
    const ok = await copyYaml();
    setCopyState(ok ? "ok" : "fail");
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  const colorGroups = getColorFieldGroups(platform);
  const styleGroups = getStyleFieldGroups(platform);

  return (
    <aside className={`${open ? "grid" : "hidden"} app-surface fixed inset-y-0 right-0 z-40 w-[92vw] max-w-[410px] grid-rows-[auto_minmax(0,1fr)] overflow-y-auto border-l border-[var(--line)] bg-[var(--panel)] shadow-2xl xl:static xl:z-auto xl:grid xl:h-[calc(100vh-52px)] xl:w-auto xl:max-w-none xl:shadow-none`}>
      {/* 动作按钮与 Form/Code 模式切换分两行：切换器整行宽度（tab 形态），动作按钮英文文案也可单行放下 */}
      <div className="grid gap-2 px-3 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={resetTheme} className="h-8 whitespace-nowrap rounded-full bg-[var(--soft)] px-3 text-[11px] font-bold">{t("ui.editor.reset")}</button>
          <button type="button" onClick={saveDraft} className="h-8 whitespace-nowrap rounded-full bg-[var(--soft)] px-3 text-[11px] font-bold">{t("ui.editor.saveDraft")}</button>
          <button type="button" onClick={generateVariant} className="h-8 whitespace-nowrap rounded-full bg-[var(--soft)] px-3 text-[11px] font-bold">{t("ui.board.generateVariant")}</button>
        </div>
        <Segmented grow items={[["visual", t("ui.editor.visual")], ["yaml", t("ui.editor.code")]]} value={editorMode} onChange={(value) => setEditorMode(value as EditorMode)} />
      </div>
      {editorMode === "visual" ? (
        <div className="min-h-0 overflow-y-auto">
          <div className="flex items-center justify-end gap-2 px-3 pt-2">
            {fieldMode === "full" ? (
              <input
                type="search"
                value={fieldQuery}
                onChange={(event) => setFieldQuery(event.target.value)}
                placeholder={t("ui.editor.searchFields")}
                className="h-8 min-w-0 flex-1 rounded-full border border-[var(--line)] bg-[var(--input)] px-3 text-[11px] outline-none"
              />
            ) : null}
            <Segmented items={[["simple", t("ui.editor.liteMode")], ["full", t("ui.editor.fullMode")]]} value={fieldMode} onChange={(value) => setFieldMode(value as FieldMode)} />
          </div>
          <Collapsible title={t("ui.right.meta")} open={openSections.meta} onToggle={() => toggleSection("meta")}>
            <div className="space-y-2 px-3 pb-3">
              <TextField label={t("ui.meta.scheme")} value={theme.id} onChange={(value) => updateMeta("id", value)} />
              <TextField label={t("ui.preview.title")} value={theme.name} onChange={(value) => updateMeta("name", value)} />
              <TextField label={t("ui.meta.author")} value={theme.author} onChange={(value) => updateMeta("author", value)} />
              {platform === "weasel" ? (
                <SelectField
                  label={t("config.meta.colorFormat")}
                  value={theme.presetColorScheme.colorFormat ?? "abgr"}
                  items={[["abgr", "ABGR"], ["argb", "ARGB"], ["rgba", "RGBA"]]}
                  onChange={(value) => updateColorFormat(value as RimeColorFormat)}
                />
              ) : null}
              {platform === "squirrel" ? (
                <SelectField
                  label={t("config.meta.colorSpace")}
                  value={theme.options.colorSpace ?? "srgb"}
                  items={[["srgb", "sRGB"], ["display_p3", "Display P3"]]}
                  onChange={(value) => updateColorSpace(value)}
                />
              ) : null}
            </div>
          </Collapsible>
          <Collapsible title={t("ui.editor.colors")} open={openSections.colors} onToggle={() => toggleSection("colors")}>
            <div className="space-y-2 px-3 pb-3">
              {fieldMode === "simple" ? (
                <FieldGroup fields={colorGroups.basic} theme={theme} platform={platform} t={t} updateColor={updateColor} />
              ) : (
                colorGroupOrder.map((group) => {
                  const fields = colorFieldMeta.filter(
                    (field) =>
                      field.group === group &&
                      field.platforms.includes(platform) &&
                      matchesQuery(field.labelKey ? t(field.labelKey) : field.rimeKey, field.importKeys ?? [field.rimeKey]),
                  );
                  if (fields.length === 0) return null;
                  return (
                    <details key={group} className="rounded-[6px] border border-[var(--line)] bg-[var(--soft)]" open={query !== "" || group === "window"}>
                      <summary className="cursor-pointer px-2 py-2 text-[11px] font-black">{t(groupLabelKey[group])}</summary>
                      <div className="grid gap-2 p-2">
                        <FieldGroup fields={fields} theme={theme} platform={platform} t={t} updateColor={updateColor} />
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          </Collapsible>
          <Collapsible title={t("ui.editor.style")} open={openSections.style} onToggle={() => toggleSection("style")}>
            <div className="space-y-2 px-3 pb-3">
              {fieldMode === "simple" ? (
                <StyleFieldList fields={styleGroups.basic} style={theme.style} platform={platform} t={t} updateStyle={updateStyle} fontFaceMode={fontFaceMode} setFontFaceMode={setFontFaceMode} localFonts={localFonts} localFontsError={localFontsError} loadLocalFonts={loadLocalFonts} />
              ) : (
                styleGroupOrder.map((group) => {
                  const fields = [...styleGroups.basic, ...styleGroups.advanced].filter(
                    (field) =>
                      field.group === group &&
                      matchesQuery(field.labelKey ? t(field.labelKey) : field.id, Object.values(field.exportPaths).flat()),
                  );
                  if (fields.length === 0) return null;
                  return (
                    <details key={group} className="rounded-[6px] border border-[var(--line)] bg-[var(--soft)]" open={query !== "" || group === "layout"}>
                      <summary className="cursor-pointer px-2 py-2 text-[11px] font-black">{t(groupLabelKey[group])}</summary>
                      <div className="grid gap-2 p-2">
                        <StyleFieldList fields={fields} style={theme.style} platform={platform} t={t} updateStyle={updateStyle} fontFaceMode={fontFaceMode} setFontFaceMode={setFontFaceMode} localFonts={localFonts} localFontsError={localFontsError} loadLocalFonts={loadLocalFonts} />
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          </Collapsible>
        </div>
      ) : (
        <div className="min-h-0 space-y-2 overflow-y-auto px-3 pb-3 pt-2">
          <div className="flex items-center justify-between gap-2">
            <label className="grid h-8 cursor-pointer place-items-center whitespace-nowrap rounded-full bg-[var(--soft)] px-3 text-[11px] font-bold">
              {t("ui.editor.upload")}
              <input type="file" accept=".yaml,.yml,text/yaml" className="sr-only" onChange={(event) => { void uploadYaml(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={downloadYaml} className="h-8 whitespace-nowrap rounded-full bg-[var(--soft)] px-3 text-[11px] font-bold">{t("ui.editor.download")}</button>
              <button type="button" onClick={handleCopy} className={`h-8 whitespace-nowrap rounded-full px-3 text-[11px] font-bold transition ${copyState === "ok" ? "bg-green-500 text-white" : copyState === "fail" ? "bg-red-500 text-white" : "bg-[var(--soft)]"}`}>
                {copyState === "ok" ? "✓" : copyState === "fail" ? "✗" : t("ui.editor.copy")}
              </button>
            </div>
          </div>
          <div className={`text-[11px] font-bold ${yamlError ? "text-red-600" : "text-[var(--muted)]"}`}>{yamlError ?? t("ui.editor.yamlReady")}</div>
          {!yamlError && yamlWarnings.length > 0 ? (
            <ul className="space-y-0.5 text-[10px] font-bold text-amber-600">
              {yamlWarnings.map((warning, index) => (
                <li key={index}>
                  ⚠ {warning.kind === "unparsed" ? t("ui.editor.warnUnparsedLine", { line: warning.line }) : t("ui.editor.warnBadValue", { line: warning.line, key: warning.key ?? "" })}
                </li>
              ))}
            </ul>
          ) : null}
          <textarea value={yamlText} onChange={(event) => setYamlText(event.target.value)} className="min-h-[480px] w-full resize-y rounded-[6px] border border-[var(--line)] bg-[var(--input)] p-2 font-mono text-[11px] leading-5 outline-none" />
        </div>
      )}
    </aside>
  );
}
