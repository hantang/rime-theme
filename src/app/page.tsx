"use client";

import { useEffect, useMemo, useState } from "react";
import { sampleThemes } from "@/data/resources";
import { loadIndexedThemes, parseThemeYaml, type YamlWarning } from "@/domain/resource-loader";
import { createLightDarkPair, isDarkScheme, pairedThemesToYaml, themesToPatchYaml, themeToYaml, type Platform, type PreviewLayout, type RimeColorField, type RimeColorFormat, type RimeStyleControls, type RimeTheme } from "@/domain/rime";
import { localeConfigs, makeTranslator, type LocaleCode } from "@/i18n/messages";
import { IconCycleButton, SelectControl } from "./_components/controls";
import { PaletteCreatorOverlay } from "./_components/palette-creator-overlay";
import { PresetBrowserOverlay } from "./_components/preset-browser-overlay";
import { PreviewCanvas } from "./_components/preview";
import { ResourceRail } from "./_components/resource-rail";
import { RightRail, type FieldMode } from "./_components/right-rail";
import {
  draftsStorageKey,
  findLightDarkPair,
  isThemeDirty,
  modeOrder,
  normalizeSchemeId,
  queryLocalFontFamilies,
  readStoredDrafts,
  sampleSets,
  themeKey,
  themeMatchesColor,
  themeToDraft,
  type ColorFilter,
  type EditorMode,
  type Filter,
  type FontFaceMode,
  type Mode,
  type PageStyle,
  type PreviewBackground,
  type PreviewBoard,
  type ResourceStatus,
  type SampleSet,
  type SampleSetKey,
} from "./_lib/workbench";

function detectLocale(): LocaleCode {
  if (typeof navigator === "undefined") return "zh-Hans";
  const lang = navigator.language;
  if (/^zh-(TW|HK|MO)/i.test(lang)) return "zh-Hant";
  if (/^zh/i.test(lang)) return "zh-Hans";
  if (/^en/i.test(lang)) return "en";
  return "zh-Hans";
}

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "weasel";
  return /Mac/i.test(navigator.userAgent) ? "squirrel" : "weasel";
}

export default function Home() {
  const [locale, setLocale] = useState<LocaleCode>(detectLocale);
  const [mode, setMode] = useState<Mode>("system");
  const [pageStyle, setPageStyle] = useState<PageStyle>("solid");
  const [filter, setFilter] = useState<Filter>("all");
  const [colorFilter, setColorFilter] = useState<ColorFilter[]>([]);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("resources/ink.yaml:ink");
  const [theme, setTheme] = useState<RimeTheme>(sampleThemes[0]);
  const [originalTheme, setOriginalTheme] = useState<RimeTheme>(sampleThemes[0]);
  const [platform, setPlatform] = useState<Platform>("weasel");
  const [layout] = useState<PreviewLayout>("horizontal");
  const [previewBackground, setPreviewBackground] = useState<PreviewBackground>("default");
  const [previewBoard, setPreviewBoard] = useState<PreviewBoard>("single");
  const [previewFontSize] = useState(12);
  const [fontFaceMode, setFontFaceMode] = useState<FontFaceMode>("common");
  const [localFonts, setLocalFonts] = useState<string[] | null>(null);
  const [localFontsError, setLocalFontsError] = useState(false);
  const [sampleKey, setSampleKey] = useState<SampleSetKey>("words");
  const [sampleCount, setSampleCount] = useState(5);
  const [sampleSelection, setSampleSelection] = useState(0);
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [fieldMode, setFieldMode] = useState<FieldMode>("simple");
  const [yamlDraft, setYamlDraft] = useState<string | null>(null);
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [yamlWarnings, setYamlWarnings] = useState<YamlWarning[]>([]);
  const [resources, setResources] = useState<RimeTheme[]>(sampleThemes);
  const [drafts, setDrafts] = useState<RimeTheme[]>([]);
  const [draftsHydrated, setDraftsHydrated] = useState(false);
  const [resourceStatus, setResourceStatus] = useState<ResourceStatus>("loading");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [presetBrowserOpen, setPresetBrowserOpen] = useState(false);
  const [paletteCreatorOpen, setPaletteCreatorOpen] = useState(false);

  const t = makeTranslator(locale);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyMode = () => {
      document.documentElement.dataset.mode = mode === "system" ? (media.matches ? "dark" : "light") : mode;
    };

    document.documentElement.lang = locale === "en" ? "en" : locale;
    document.documentElement.dataset.style = pageStyle;
    applyMode();
    media.addEventListener("change", applyMode);
    return () => media.removeEventListener("change", applyMode);
  }, [locale, mode, pageStyle]);

  // 平台检测依赖 navigator，只能在客户端水合后设置，避免 SSR 与客户端首帧不一致
  useEffect(() => {
    const timer = window.setTimeout(() => setPlatform(detectPlatform()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDrafts(readStoredDrafts());
      setDraftsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (draftsHydrated) window.localStorage.setItem(draftsStorageKey, JSON.stringify(drafts.slice(0, 20)));
  }, [drafts, draftsHydrated]);

  useEffect(() => {
    let cancelled = false;
    void loadIndexedThemes()
      .then((loaded) => {
        if (cancelled) return;
        if (loaded.length === 0) throw new Error("Resource bundle is empty");
        setResources(loaded);
        const preferred = loaded.find((item) => item.id === "ink") ?? loaded[0];
        selectTheme(preferred);
        setResourceStatus("ready");
      })
      .catch((error) => {
        console.error("Failed to load theme resource bundle, falling back to bundled samples:", error);
        if (!cancelled) setResourceStatus("fallback");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleThemes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((item) => {
      const matchesFilter = filter === "all" || item.tags.includes(filter);
      const matchesColor = themeMatchesColor(item, colorFilter);
      const matchesQuery = !q || [item.name, item.author, item.sourceFile].some((value) => value.toLowerCase().includes(q));
      return matchesFilter && matchesColor && matchesQuery;
    });
  }, [colorFilter, filter, query, resources]);

  // 选中项随数量变化钳制在 [0, count-1]，避免数量调小后高亮丢失
  const clampedSelection = Math.min(sampleSelection, sampleCount - 1);
  const sample: SampleSet = { ...sampleSets[sampleKey], candidates: sampleSets[sampleKey].candidates.slice(0, sampleCount), selection: clampedSelection };
  const lightDarkPair = useMemo(() => findLightDarkPair(theme, [...drafts, ...resources]), [theme, drafts, resources]);
  const generatedYaml = useMemo(() => {
    if (theme.pairId && lightDarkPair?.pairId === theme.pairId) {
      return pairedThemesToYaml(theme, lightDarkPair, platform);
    }
    return themeToYaml(theme, platform);
  }, [theme, lightDarkPair, platform]);
  const yamlText = yamlDraft ?? generatedYaml;

  function selectTheme(next: RimeTheme) {
    setSelectedKey(themeKey(next));
    setTheme(structuredClone(next));
    setOriginalTheme(structuredClone(next));
    setYamlDraft(null);
    setYamlError(null);
    setYamlWarnings([]);
  }

  function toggleColorFilter(color: ColorFilter) {
    setColorFilter((current) => (current.includes(color) ? current.filter((item) => item !== color) : [...current, color]));
  }

  function cycleMode() {
    const currentIndex = modeOrder.indexOf(mode);
    setMode(modeOrder[(currentIndex + 1) % modeOrder.length]);
  }

  function updateMeta(field: "id" | "name" | "author", value: string) {
    setTheme((current) => {
      const nextValue = field === "id" ? normalizeSchemeId(value, current.id) : value.slice(0, 80);
      return {
        ...current,
        [field]: nextValue,
        presetColorScheme: {
          ...current.presetColorScheme,
          [field]: nextValue,
        },
      };
    });
    setYamlDraft(null);
    setYamlError(null);
    setYamlWarnings([]);
  }

  function updateColor(field: RimeColorField, value: string) {
    setTheme((current) => {
      // 该字段在当前平台已有专属取值时（源 YAML 同时给出了两个平台键名），编辑应更新对应平台的取值，
      // 而不是共享的 colors，否则改动会被 resolveThemeColor 优先读取的 colorOverrides 遮蔽、看似没有生效
      if (current.colorOverrides?.[platform]?.[field] !== undefined) {
        return {
          ...current,
          colorOverrides: {
            ...current.colorOverrides,
            [platform]: { ...current.colorOverrides[platform], [field]: value },
          },
        };
      }
      return { ...current, colors: { ...current.colors, [field]: value } };
    });
    setYamlDraft(null);
    setYamlError(null);
    setYamlWarnings([]);
  }

  function updateStyle<K extends keyof RimeStyleControls>(key: K, value: RimeStyleControls[K]) {
    setTheme((current) => ({ ...current, style: { ...current.style, [key]: value } }));
    setYamlDraft(null);
    setYamlError(null);
    setYamlWarnings([]);
  }

  function updateColorFormat(value: RimeColorFormat | "") {
    setTheme((current) => ({
      ...current,
      presetColorScheme: { ...current.presetColorScheme, colorFormat: value === "" ? undefined : value },
    }));
    setYamlDraft(null);
    setYamlError(null);
    setYamlWarnings([]);
  }

  function updateColorSpace(value: string) {
    setTheme((current) => ({
      ...current,
      options: { ...current.options, colorSpace: value === "" ? undefined : value },
    }));
    setYamlDraft(null);
    setYamlError(null);
    setYamlWarnings([]);
  }

  async function loadLocalFonts() {
    const result = await queryLocalFontFamilies();
    if (result.ok) {
      setLocalFonts(result.families);
      setLocalFontsError(false);
    } else {
      setLocalFontsError(result.reason === "denied");
    }
  }

  function updateYamlText(value: string) {
    setYamlDraft(value);
    const warnings: YamlWarning[] = [];
    const parsedThemes = parseThemeYaml(value, theme.sourceFile, warnings);
    const parsed = parsedThemes.find((item) => item.id === theme.id) ?? parsedThemes[0];
    if (!parsed) {
      setYamlError(t("ui.editor.yamlError"));
      setYamlWarnings([]);
      return;
    }

    const next = {
      ...parsed,
      sourceFile: theme.sourceFile,
      pairId: theme.pairId,
    };
    setTheme(next);
    setSelectedKey(themeKey(next));
    setYamlError(null);
    setYamlWarnings(warnings);
  }

  async function copyYaml(): Promise<boolean> {
    if (!navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(yamlText);
      return true;
    } catch {
      return false;
    }
  }

  function downloadYaml() {
    const blob = new Blob([yamlText], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${normalizeSchemeId(theme.id, "theme")}.${platform}.custom.yaml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadBatchYaml(themes: RimeTheme[]) {
    if (themes.length === 0) return;
    const blob = new Blob([themesToPatchYaml(themes, platform)], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rime-themes.${platform}.custom.yaml`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function uploadYaml(file: File | null) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setYamlError(t("ui.editor.yamlSizeLimit"));
      return;
    }
    const text = await file.text();
    const warnings: YamlWarning[] = [];
    const parsed = parseThemeYaml(text, `uploads/${file.name}`, warnings);
    if (parsed.length === 0) {
      setYamlDraft(text);
      setYamlError(t("ui.editor.yamlError"));
      return;
    }
    selectTheme(parsed[0]);
    setYamlDraft(text);
    setYamlWarnings(warnings);
  }

  function resetTheme() {
    selectTheme(originalTheme);
  }

  function saveDraft() {
    const draft = themeToDraft(theme, t("ui.drafts.title"));
    upsertDraft(draft);
    setSelectedKey(themeKey(draft));
  }

  function upsertDraft(draft: RimeTheme) {
    setDrafts((current) => [structuredClone(draft), ...current.filter((item) => themeKey(item) !== themeKey(draft))].slice(0, 20));
  }

  // spec §6：生成反色变体——基础方案与变体都入草稿，选中基础方案（明暗板即见配对）
  function generateVariant(source: RimeTheme) {
    const variantIsDark = !isDarkScheme(source.colors);
    const { base, variant } = createLightDarkPair(source, t(variantIsDark ? "ui.variant.dark" : "ui.variant.light"));
    upsertDraft(base);
    upsertDraft(variant);
    selectTheme(base);
  }

  // spec §5：切换平台时自动 upsert 当前草稿（脏的预设先转草稿；不切换选中项）
  function switchPlatform(next: Platform) {
    if (next !== platform && (theme.sourceFile.startsWith("drafts/") || isThemeDirty(theme, originalTheme))) {
      upsertDraft(themeToDraft(theme, t("ui.drafts.title")));
    }
    setPlatform(next);
  }

  function usePaletteTheme(next: RimeTheme) {
    selectTheme(next);
    upsertDraft(next);
  }

  function clearDrafts() {
    setDrafts([]);
    const fallback = resources[0] ?? sampleThemes[0];
    if (drafts.some((d) => themeKey(d) === selectedKey)) selectTheme(fallback);
  }

  function deleteDraft(draft: RimeTheme) {
    setDrafts((current) => current.filter((item) => themeKey(item) !== themeKey(draft)));
    if (selectedKey === themeKey(draft)) {
      const fallback = resources[0] ?? sampleThemes[0];
      selectTheme(fallback);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--page)] text-[var(--ink)]">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2 lg:h-[52px] lg:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="size-8 shrink-0 rounded-[7px] bg-[linear-gradient(135deg,var(--accent),#01b2ff_48%,#07111f_49%)]" />
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="shrink-0 text-[15px] font-black tracking-normal lg:text-[16px]">Rime Theme Studio</h1>
            <span className="hidden truncate text-[11px] font-semibold text-[var(--muted)] sm:inline">{t("ui.app.byline")}</span>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <SelectControl label={t("ui.nav.language")} value={locale} onChange={(value) => setLocale(value as LocaleCode)} items={localeConfigs.map((item) => [item.code, item.label])} />
          <SelectControl label={t("ui.control.platform")} value={platform} onChange={(value) => switchPlatform(value as Platform)} items={[["weasel", t("config.platform.weasel")], ["squirrel", t("config.platform.squirrel")]]} />
          <SelectControl label={t("ui.nav.surface")} value={pageStyle} onChange={(value) => setPageStyle(value as PageStyle)} items={[["solid", t("ui.surface.solid")], ["glass", t("ui.surface.glass")], ["swatch", t("ui.surface.swatch")]]} />
          <IconCycleButton label={t("ui.nav.interface")} title={t(`ui.mode.${mode}`)} mode={mode} onClick={cycleMode} />
        </div>
      </header>

      <div className="fixed left-3 right-3 top-[64px] z-30 flex justify-between xl:hidden">
        <button type="button" onClick={() => setLeftOpen(true)} className="rounded-full bg-[var(--ink)] px-4 py-2 text-[13px] font-black text-[var(--panel)] shadow-lg">{t("ui.resources.title")}</button>
        <button type="button" onClick={() => setRightOpen(true)} className="rounded-full bg-[var(--ink)] px-4 py-2 text-[13px] font-black text-[var(--panel)] shadow-lg">{t("ui.right.editor")}</button>
      </div>
      {(leftOpen || rightOpen) && <button type="button" aria-label={t("ui.panel.close")} onClick={() => { setLeftOpen(false); setRightOpen(false); }} className="fixed inset-0 z-30 bg-black/25 xl:hidden" />}

      <div className="grid min-h-[calc(100vh-52px)] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_390px]">
        <ResourceRail t={t} filter={filter} setFilter={setFilter} colorFilter={colorFilter} toggleColorFilter={toggleColorFilter} query={query} setQuery={setQuery} selectedKey={selectedKey} drafts={drafts} themes={visibleThemes} total={resources.length} status={resourceStatus} open={leftOpen} onClose={() => setLeftOpen(false)} onOpenBrowser={() => setPresetBrowserOpen(true)} onCreatePalette={() => setPaletteCreatorOpen(true)} onDeleteDraft={deleteDraft} onClearDrafts={clearDrafts} onSelect={(next) => { selectTheme(next); setLeftOpen(false); }} onGenerateVariant={generateVariant} />
        <PreviewCanvas t={t} theme={theme} layout={layout} platform={platform} sample={sample} previewBackground={previewBackground} previewFontSize={previewFontSize} sampleKey={sampleKey} setSampleKey={setSampleKey} sampleCount={sampleCount} setSampleCount={setSampleCount} sampleSelection={clampedSelection} setSampleSelection={setSampleSelection} setPreviewBackground={setPreviewBackground} previewBoard={previewBoard} setPreviewBoard={setPreviewBoard} lightDarkPair={lightDarkPair} onGenerateVariant={() => generateVariant(theme)} />
        <RightRail t={t} theme={theme} platform={platform} fieldMode={fieldMode} setFieldMode={setFieldMode} updateMeta={updateMeta} updateColorFormat={updateColorFormat} updateColorSpace={updateColorSpace} editorMode={editorMode} setEditorMode={setEditorMode} yamlText={yamlText} setYamlText={updateYamlText} yamlError={yamlError} yamlWarnings={yamlWarnings} updateColor={updateColor} updateStyle={updateStyle} copyYaml={copyYaml} downloadYaml={downloadYaml} uploadYaml={uploadYaml} resetTheme={resetTheme} saveDraft={saveDraft} generateVariant={() => generateVariant(theme)} open={rightOpen} fontFaceMode={fontFaceMode} setFontFaceMode={setFontFaceMode} localFonts={localFonts} localFontsError={localFontsError} loadLocalFonts={loadLocalFonts} />
      </div>

      {presetBrowserOpen && (
        <PresetBrowserOverlay t={t} themes={visibleThemes} total={resources.length} onSelectTheme={selectTheme} onExport={downloadBatchYaml} onClose={() => setPresetBrowserOpen(false)} />
      )}
      {paletteCreatorOpen && (
        <PaletteCreatorOverlay t={t} onUseTheme={usePaletteTheme} onClose={() => setPaletteCreatorOpen(false)} />
      )}
    </main>
  );
}
