import { useState } from "react";
import type { Platform, PreviewLayout, RimeTheme } from "@/domain/rime";
import type { makeTranslator } from "@/i18n/messages";
import { CloseButton, Segmented, SelectField } from "./controls";
import { CandidateWindow, getCanvasBackground } from "./preview";
import { ColorFilterDots } from "./resource-rail";
import { filters, sampleSets, themeKey, type ColorFilter, type Filter, type PresetBrowserView, type PreviewBackground, type SampleSet, type SampleSetKey } from "../_lib/workbench";

type Translator = ReturnType<typeof makeTranslator>;

export function PresetBrowserOverlay({
  t,
  themes,
  total,
  onSelectTheme,
  onExport,
  onClose,
}: {
  t: Translator;
  themes: RimeTheme[];
  total: number;
  onSelectTheme: (theme: RimeTheme) => void;
  onExport: (selected: RimeTheme[]) => void;
  onClose: () => void;
}) {
  const [localFilter, setLocalFilter] = useState<Filter>("all");
  const [localColorFilter, setLocalColorFilter] = useState<ColorFilter[]>([]);
  const [localQuery, setLocalQuery] = useState("");
  const [localSelectedKeys, setLocalSelectedKeys] = useState<string[]>([]);
  const [localView, setLocalView] = useState<PresetBrowserView>("grid");
  const [localPlatform, setLocalPlatform] = useState<Platform>("weasel");
  const [localLayout, setLocalLayout] = useState<PreviewLayout>("horizontal");
  const [localSample, setLocalSample] = useState(sampleSets.chars);
  const [localSampleKey, setLocalSampleKey] = useState<SampleSetKey>("chars");
  const localPreviewBackground: PreviewBackground = "default";
  const localPreviewFontSize = 14;

  const selectedSet = new Set(localSelectedKeys);
  const visibleKeys = themes.map(themeKey);
  const canvasBackground = getCanvasBackground(localPreviewBackground);

  function toggleTheme(key: string) {
    setLocalSelectedKeys(selectedSet.has(key) ? localSelectedKeys.filter((item) => item !== key) : [...localSelectedKeys, key]);
  }

  function selectVisible() {
    setLocalSelectedKeys(Array.from(new Set([...localSelectedKeys, ...visibleKeys])));
  }

  function toggleColorFilter(color: ColorFilter) {
    setLocalColorFilter(localColorFilter.includes(color) ? localColorFilter.filter(c => c !== color) : [...localColorFilter, color]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] xl:p-8">
      <div className="grid h-[88vh] w-[min(1280px,calc(100vw-32px))] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--panel)] shadow-2xl xl:h-[82vh] xl:grid-cols-[280px_minmax(0,1fr)] xl:grid-rows-none">
        <aside className="min-h-0 overflow-y-auto border-b border-[var(--line)] p-4 xl:border-b-0 xl:border-r">
          <div className="mb-4">
            <div className="text-[20px] font-black">{t("ui.browser.title")}</div>
            <div className="mt-1 text-[12px] font-bold text-[var(--muted)]">{themes.length}/{total} {t("ui.browser.count")}</div>
          </div>
          <input value={localQuery} onChange={(event) => setLocalQuery(event.target.value)} aria-label={t("ui.resources.search")} placeholder={t("ui.resources.search")} className="mb-3 h-9 w-full rounded-full border border-[var(--line)] bg-[var(--input)] px-3 text-[12px] font-semibold outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]" />
          <div className="mb-4 flex flex-wrap gap-1.5 border-b border-[var(--line)] pb-4">
            {filters.map((item) => (
              <button key={item} type="button" onClick={() => setLocalFilter(item)} className={`h-7 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold transition ${localFilter === item ? "bg-[var(--ink)] text-[var(--panel)]" : "bg-[var(--soft)] text-[var(--ink)]"}`}>
                {item === "all" ? t("ui.filter.all") : t(`data.styleTag.${item}`)}
              </button>
            ))}
          </div>
          <div className="mb-4 border-b border-[var(--line)] pb-4">
            <div className="mb-2 text-[11px] font-black text-[var(--muted)]">{t("ui.filter.byColor")}</div>
            <ColorFilterDots value={localColorFilter} onToggle={toggleColorFilter} />
          </div>
          <div className="space-y-2">
            <SelectField label={t("ui.browser.view")} value={localView} onChange={(value) => setLocalView(value as PresetBrowserView)} items={[["grid", t("ui.browser.grid")], ["strips", t("ui.browser.strips")], ["compact", t("ui.browser.compact")]]} />
            <SelectField label={t("ui.control.platform")} value={localPlatform} onChange={(value) => setLocalPlatform(value as Platform)} items={[["weasel", t("config.platform.weasel")], ["squirrel", t("config.platform.squirrel")]]} />
            <SegmentRow label={t("ui.control.layout")} items={[["horizontal", t("config.styleField.layoutLinear")], ["vertical", t("config.styleField.layoutStacked")]]} value={localLayout} onChange={(value) => setLocalLayout(value as PreviewLayout)} />
            <SelectField label={t("ui.control.sample")} value={localSampleKey} onChange={(value) => { setLocalSampleKey(value as SampleSetKey); setLocalSample(sampleSets[value as SampleSetKey]); }} items={[["chars", t("data.sample.chars")], ["words", t("data.sample.words")], ["sentences", t("data.sample.sentences")], ["mixed", t("data.sample.mixed")]]} />
          </div>
        </aside>
        <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-5 py-3">
            <div className="flex items-center gap-2 text-[12px] font-bold text-[var(--muted)]">
              <span>{t("ui.browser.selected")}: {localSelectedKeys.length}</span>
              <button type="button" onClick={selectVisible} className="h-8 whitespace-nowrap rounded-full bg-[var(--soft)] px-3 text-[11px] font-black text-[var(--ink)]">{t("ui.browser.selectVisible")}</button>
              <button type="button" onClick={() => setLocalSelectedKeys([])} className="h-8 whitespace-nowrap rounded-full bg-[var(--soft)] px-3 text-[11px] font-black text-[var(--ink)]">{t("ui.browser.clear")}</button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={localSelectedKeys.length === 0} onClick={() => onExport(themes.filter((item) => selectedSet.has(themeKey(item))))} className="h-8 whitespace-nowrap rounded-full bg-[var(--ink)] px-3 text-[11px] font-black text-[var(--panel)] disabled:cursor-not-allowed disabled:opacity-40">{t("ui.browser.exportSelected")}</button>
              <CloseButton label={t("ui.browser.close")} onClick={onClose} />
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto p-5 [scrollbar-gutter:stable]">
            {themes.length === 0 ? (
              <div className="grid h-full place-items-center text-[13px] font-bold text-[var(--muted)]">{t("ui.browser.empty")}</div>
            ) : (
              <div className={localView === "strips" ? "grid gap-3" : localView === "compact" ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-3" : "grid gap-4 lg:grid-cols-2"}>
                {themes
                  .filter((item) => {
                    if (localColorFilter.length > 0) {
                      // Filter by color if selected
                      return localColorFilter.some(c => item.colors[`${c}Color` as keyof typeof item.colors]);
                    }
                    return true;
                  })
                  .filter((item) => {
                    if (localFilter !== "all" && !item.tags.includes(localFilter)) return false;
                    if (localQuery && !item.name.toLowerCase().includes(localQuery.toLowerCase())) return false;
                    return true;
                  })
                  .map((item) => {
                    const key = themeKey(item);
                    return (
                      <PresetBrowserCard
                        key={key}
                        t={t}
                        theme={item}
                        selected={selectedSet.has(key)}
                        view={localView}
                        layout={localLayout}
                        platform={localPlatform}
                        sample={localSample}
                        previewFontSize={localPreviewFontSize}
                        canvasBackground={canvasBackground}
                        onToggle={() => toggleTheme(key)}
                        onOpen={() => onSelectTheme(item)}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PresetBrowserCard({
  t,
  theme,
  selected,
  view,
  layout,
  platform,
  sample,
  previewFontSize,
  canvasBackground,
  onToggle,
  onOpen,
}: {
  t: Translator;
  theme: RimeTheme;
  selected: boolean;
  view: PresetBrowserView;
  layout: PreviewLayout;
  platform: Platform;
  sample: SampleSet;
  previewFontSize: number;
  canvasBackground: string;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const isStrip = view === "strips";
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(); } }}
      className={`[contain-intrinsic-size:240px] [content-visibility:auto] cursor-pointer rounded-[8px] border bg-[var(--soft)] p-2 text-left transition hover:border-[var(--ink)] ${selected ? "border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-soft)]" : "border-[var(--line)]"} ${isStrip ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3" : ""}`}
    >
      <div
        className={`w-full overflow-hidden rounded-[6px] border border-[var(--line)] p-3 ${view === "compact" ? "min-h-[96px]" : "min-h-[170px]"} ${isStrip ? "min-h-[138px]" : ""}`}
        style={{ background: canvasBackground, backgroundSize: canvasBackground.includes("linear-gradient") ? "20px 20px" : undefined }}
      >
        <CandidateWindow
          t={t}
          theme={theme}
          layout={layout}
          platform={platform}
          sample={{ ...sample, candidates: sample.candidates.slice(0, view === "compact" ? 4 : 5) }}
          previewFontSize={view === "compact" ? Math.max(10, previewFontSize - 3) : Math.max(10, previewFontSize - 1)}
        />
      </div>
      <div className={view === "compact" ? "mt-2 min-w-0" : "min-w-0"}>
        <div className="truncate text-[13px] font-black">{theme.name}</div>
        <div className="truncate text-[10px] font-bold text-[var(--muted)]">{theme.sourceFile}</div>
        {view !== "compact" && (
          <div className="mt-1 flex flex-wrap gap-1">
            {theme.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-[10px] font-black text-[var(--muted)]">{tag}</span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex h-8 items-center whitespace-nowrap rounded-full px-3 text-[11px] font-black ${selected ? "bg-[var(--ink)] text-[var(--panel)]" : "bg-[var(--panel)] text-[var(--ink)]"}`}>
            {selected ? t("ui.browser.selected") : t("ui.browser.select")}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="inline-flex h-8 items-center whitespace-nowrap rounded-full bg-[var(--accent)] px-3 text-[11px] font-black text-white"
          >
            {t("ui.browser.openEditor")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SegmentRow({ label, items, value, onChange }: { label: string; items: Array<[string, string]>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex min-h-8 items-start justify-between gap-3">
      <span className="mt-2 shrink-0 text-[11px] font-bold">{label}</span>
      <Segmented items={items} value={value} onChange={onChange} />
    </div>
  );
}
