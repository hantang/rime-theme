import { Contrast, Dices, Library, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RimeTheme } from "@/domain/rime";
import { getThemeSwatches } from "@/data/resources";
import type { makeTranslator } from "@/i18n/messages";
import { colorFilters, filters, themeKey, type ColorFilter, type Filter, type ResourceStatus } from "../_lib/workbench";

type Translator = ReturnType<typeof makeTranslator>;

export function ResourceRail({
  t,
  filter,
  setFilter,
  colorFilter,
  toggleColorFilter,
  query,
  setQuery,
  selectedKey,
  drafts,
  themes,
  total,
  status,
  open,
  onClose,
  onOpenBrowser,
  onCreatePalette,
  onRandomTheme,
  randomEnabled,
  onDeleteDraft,
  onClearDrafts,
  onSelect,
  onGenerateVariant,
}: {
  t: Translator;
  filter: Filter;
  setFilter: (filter: Filter) => void;
  colorFilter: ColorFilter[];
  toggleColorFilter: (color: ColorFilter) => void;
  query: string;
  setQuery: (query: string) => void;
  selectedKey: string;
  drafts: RimeTheme[];
  themes: RimeTheme[];
  total: number;
  status: ResourceStatus;
  open: boolean;
  onClose: () => void;
  onOpenBrowser: () => void;
  onCreatePalette: () => void;
  onRandomTheme: () => void;
  randomEnabled: boolean;
  onDeleteDraft: (theme: RimeTheme) => void;
  onClearDrafts: () => void;
  onSelect: (theme: RimeTheme) => void;
  onGenerateVariant: (theme: RimeTheme) => void;
}) {
  const [displayCount, setDisplayCount] = useState(30);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const displayedThemes = useMemo(() => themes.slice(0, displayCount), [themes, displayCount]);
  const hasMore = displayCount < themes.length;

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore) {
        setDisplayCount((c) => c + 30);
      }
    }, { threshold: 0.1 });

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <aside className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-[86vw] max-w-[340px] flex-col border-r border-[var(--line)] bg-[var(--panel)] p-3 shadow-2xl xl:static xl:z-auto xl:flex xl:h-[calc(100vh-52px)] xl:w-auto xl:max-w-none xl:shadow-none`}>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[15px] font-black">{t("ui.resources.title")}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRandomTheme} disabled={!randomEnabled} title={t("ui.resources.randomTheme")} aria-label={t("ui.resources.randomTheme")} className="grid size-8 place-items-center rounded-full bg-[var(--soft)] text-[var(--ink)] transition hover:bg-[var(--soft-strong)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--soft)]">
            <Dices className="size-4" />
          </button>
          <button type="button" onClick={onOpenBrowser} title={t("ui.resources.browseAll")} aria-label={t("ui.resources.browseAll")} className="grid size-8 place-items-center rounded-full bg-[var(--soft)] text-[var(--ink)] transition hover:bg-[var(--soft-strong)]">
            <Library className="size-4" />
          </button>
          <button type="button" onClick={onCreatePalette} title={t("ui.resources.createPalette")} aria-label={t("ui.resources.createPalette")} className="grid size-8 place-items-center rounded-full bg-[var(--ink)] text-[var(--panel)] transition hover:opacity-85">
            <Plus className="size-4" />
          </button>
          <button type="button" onClick={onClose} className="text-[16px] font-bold leading-none xl:hidden">&times;</button>
        </div>
      </div>
      {status === "fallback" ? (
        <div className="mb-2 rounded-md bg-amber-500/15 px-2 py-1.5 text-[10px] font-bold text-amber-600">{t("ui.resources.loadFailed")}</div>
      ) : null}
      <div className="mb-2 text-[11px] font-bold text-[var(--muted)]">{status === "loading" ? "..." : `${themes.length}/${total} ${t("ui.browser.count")}`}</div>
      <label className="mb-2.5 flex h-8 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--input)] px-3 focus-within:border-[var(--accent)]">
        <Search className="size-3.5 text-[var(--muted)]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("ui.resources.search")} placeholder={t("ui.resources.search")} className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold outline-none placeholder:text-[var(--muted)]" />
      </label>
      <div className="mb-2.5 flex flex-wrap gap-1.5 border-b border-[var(--line)] pb-2.5">
        {filters.map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} className={`h-7 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${filter === item ? "bg-[var(--ink)] text-[var(--panel)]" : "bg-[var(--soft)] text-[var(--ink)]"}`}>
            {item === "all" ? t("ui.filter.all") : t(`data.styleTag.${item}`)}
          </button>
        ))}
      </div>
      <div className="mb-3 border-b border-[var(--line)] pb-3">
        <div className="mb-2 text-[10px] font-black uppercase text-[var(--muted)]">{t("ui.filter.byColor")}</div>
        <ColorFilterDots value={colorFilter} onToggle={toggleColorFilter} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {drafts.length > 0 && (
          <div className="mb-3 border-b border-[var(--line)] pb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[10px] font-black uppercase text-[var(--muted)]">{t("ui.drafts.title")}</div>
              <button type="button" onClick={onClearDrafts} className="text-[10px] font-bold text-[var(--muted)] hover:text-red-500 transition">
                {t("ui.drafts.clearAll")}
              </button>
            </div>
            <div className="space-y-1.5">
              {drafts.map((item) => (
                <ThemeButton key={themeKey(item)} item={item} selected={selectedKey === themeKey(item)} onSelect={onSelect} onDelete={onDeleteDraft} deleteLabel={t("ui.resources.deleteDraft")} onGenerateVariant={onGenerateVariant} generateLabel={t("ui.board.generateVariant")} />
              ))}
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          {displayedThemes.map((item) => (
            <ThemeButton key={themeKey(item)} item={item} selected={selectedKey === themeKey(item)} onSelect={onSelect} onGenerateVariant={onGenerateVariant} generateLabel={t("ui.board.generateVariant")} />
          ))}
        </div>
        {hasMore && <div ref={sentinelRef} className="h-2 mt-2" />}
      </div>
    </aside>
  );
}

export function ColorFilterDots({ value, onToggle }: { value: ColorFilter[]; onToggle: (color: ColorFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colorFilters.map((item) => {
        const active = value.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={active}
            onClick={() => onToggle(item.id)}
            className={`size-7 rounded-full border transition ${active ? "border-[var(--ink)] shadow-[0_0_0_3px_var(--accent-soft)]" : "border-[var(--line)] hover:scale-105"}`}
            style={{ backgroundColor: item.color }}
          />
        );
      })}
    </div>
  );
}

function ThemeButton({ item, selected, onSelect, onDelete, deleteLabel, onGenerateVariant, generateLabel }: { item: RimeTheme; selected: boolean; onSelect: (theme: RimeTheme) => void; onDelete?: (theme: RimeTheme) => void; deleteLabel?: string; onGenerateVariant?: (theme: RimeTheme) => void; generateLabel?: string }) {
  const actionClass = "grid size-7 place-items-center rounded-full bg-[var(--soft)] text-[var(--muted)] opacity-90 transition hover:bg-[var(--ink)] hover:text-[var(--panel)] group-hover:opacity-100";
  return (
    <div className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-1 rounded-[6px] border bg-[var(--panel)] p-1 transition ${selected ? "border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-soft)]" : "border-[var(--line)] hover:border-[var(--ink)]"}`}>
      <button type="button" onClick={() => onSelect(item)} className="grid min-w-0 grid-cols-[64px_1fr] gap-2 rounded-[5px] p-1 text-left">
        <div className="grid h-full min-h-10 grid-cols-2 overflow-hidden rounded-[4px] border border-[var(--line)]">
          {getThemeSwatches(item).map((swatch, idx) => (
            <span key={`${swatch.color}-${idx}`} style={{ backgroundColor: swatch.color }} />
          ))}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-black">{item.name}</div>
          <div className="truncate text-[10px] font-bold text-[var(--muted)]">{item.author}</div>
        </div>
      </button>
      <div className="flex flex-col items-center justify-center gap-1">
        {onGenerateVariant ? (
          <button
            type="button"
            title={generateLabel}
            aria-label={generateLabel}
            onClick={(event) => {
              event.stopPropagation();
              onGenerateVariant(item);
            }}
            className={actionClass}
          >
            <Contrast className="size-3.5" />
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            title={deleteLabel}
            aria-label={deleteLabel}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(item);
            }}
            className={actionClass}
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
