import { ImageUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { withBasePath } from "@/domain/base-path";
import type { RimeTheme } from "@/domain/rime";
import type { MessageKey, makeTranslator } from "@/i18n/messages";
import { OverlayShell } from "./overlay-shell";
import { createThemeFromPalette, pickDistinctPaletteColors } from "../_lib/workbench";

type Translator = ReturnType<typeof makeTranslator>;
type PaletteSource = "figma" | "bairesdev";
type ColorPalette = { _id: string; name: string; colors: string[]; tags: string[]; source?: PaletteSource };

// ── Category data ─────────────────────────────────────────────────────────

export const STYLE_TAGS = [
  "Bright", "Complementary", "Cool", "Dark",
  "Earthy", "Monochromatic", "Neutral", "Pastel", "Retro", "Warm",
] as const;

export const COLOR_TAGS = [
  "Red", "Orange", "Yellow", "Green", "Teal", "Blue", "Navy Blue",
  "Purple", "Pink", "Burgundy", "Maroon", "Brown",
  "Gold", "Peach", "Beige", "White", "Grey", "Black",
  "Turquoise", "Dark Green",
] as const;

export const INSPIRATION_TAGS = [
  "Sunset", "Ocean", "Tropical", "Spring", "Summer",
  "Autumn", "Winter", "Beach", "Desert", "Christmas", "Rainbow",
] as const;

// Source chips are proper nouns, shown as-is (no i18n)
export const SOURCE_TAGS = ["Figma", "BairesDev"] as const;

type StyleTag = (typeof STYLE_TAGS)[number];
type ColorTag = (typeof COLOR_TAGS)[number];
type InspirationTag = (typeof INSPIRATION_TAGS)[number];
type SourceTag = (typeof SOURCE_TAGS)[number];
type AnyTag = StyleTag | ColorTag | InspirationTag | SourceTag;

const sourceBySourceTag: Record<SourceTag, PaletteSource> = { Figma: "figma", BairesDev: "bairesdev" };

// Style tags reuse the existing data.styleTag.* i18n keys
const styleI18nKey: Record<StyleTag, MessageKey> = {
  Bright: "data.styleTag.bright", Complementary: "data.styleTag.complementary",
  Cool: "data.styleTag.cool", Dark: "data.styleTag.dark", Earthy: "data.styleTag.earthy",
  Monochromatic: "data.styleTag.monochromatic", Neutral: "data.styleTag.neutral",
  Pastel: "data.styleTag.pastel", Retro: "data.styleTag.retro", Warm: "data.styleTag.warm",
};

// Color + Inspiration tags use data.tag.color.* / data.tag.inspiration.* i18n keys
const colorI18nKey: Record<ColorTag, MessageKey> = {
  Red: "data.tag.color.red", Orange: "data.tag.color.orange", Yellow: "data.tag.color.yellow",
  Green: "data.tag.color.green", Teal: "data.tag.color.teal", Blue: "data.tag.color.blue",
  "Navy Blue": "data.tag.color.navyBlue", Purple: "data.tag.color.purple", Pink: "data.tag.color.pink",
  Burgundy: "data.tag.color.burgundy", Maroon: "data.tag.color.maroon", Brown: "data.tag.color.brown",
  Gold: "data.tag.color.gold", Peach: "data.tag.color.peach", Beige: "data.tag.color.beige",
  White: "data.tag.color.white", Grey: "data.tag.color.grey", Black: "data.tag.color.black",
  Turquoise: "data.tag.color.turquoise", "Dark Green": "data.tag.color.darkGreen",
};

const inspirationI18nKey: Record<InspirationTag, MessageKey> = {
  Sunset: "data.tag.inspiration.sunset", Ocean: "data.tag.inspiration.ocean", Tropical: "data.tag.inspiration.tropical",
  Spring: "data.tag.inspiration.spring", Summer: "data.tag.inspiration.summer", Autumn: "data.tag.inspiration.autumn",
  Winter: "data.tag.inspiration.winter", Beach: "data.tag.inspiration.beach", Desert: "data.tag.inspiration.desert",
  Christmas: "data.tag.inspiration.christmas", Rainbow: "data.tag.inspiration.rainbow",
};

// ── Image upload constants ────────────────────────────────────────────────────

const maxImageSize = 4 * 1024 * 1024;
const supportedImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// ── Component ─────────────────────────────────────────────────────────────────

export function PaletteCreatorOverlay({
  t,
  open,
  onUseTheme,
  onClose,
}: {
  t: Translator;
  open: boolean;
  onUseTheme: (theme: RimeTheme) => void;
  onClose: () => void;
}) {
  const [imageCandidates, setImageCandidates] = useState<ColorPalette[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [activeTag, setActiveTag] = useState<AnyTag | null>(null);
  const [search, setSearch] = useState("");
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20);
  const appliedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 组件常驻挂载以保留上传/筛选状态，色板数据推迟到首次打开时再拉取
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    void Promise.all([
      fetchPalettes("/data/figma-color-palettes.json", "figma"),
      fetchPalettes("/data/bairesdev-color-palettes.json", "bairesdev"),
    ]).then(([figma, bairesdev]) => {
      const merged = [...figma, ...bairesdev];
      if (merged.length > 0) setPalettes(merged);
      else fetchedRef.current = false;
    });
  }, [open]);

  useEffect(() => {
    return () => { if (appliedTimerRef.current) clearTimeout(appliedTimerRef.current); };
  }, []);

  const filteredPalettes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeSource = activeTag ? sourceBySourceTag[activeTag as SourceTag] : undefined;
    return palettes.filter((p) => {
      if (activeSource) {
        if (p.source !== activeSource) return false;
      } else if (activeTag && !p.tags.includes(activeTag)) {
        return false;
      }
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [palettes, activeTag, search]);

  const displayedPalettes = useMemo(() => filteredPalettes.slice(0, displayCount), [filteredPalettes, displayCount]);
  const hasMore = displayCount < filteredPalettes.length;

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore) {
        setDisplayCount((c) => c + 20);
      }
    }, { threshold: 0.1 });

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  function applyPalette(p: ColorPalette) {
    const candidate = { id: p._id, name: p.name, colors: p.colors, source: "style" as const };
    onUseTheme(createThemeFromPalette(candidate));
    setLastAppliedId(p._id);
    if (appliedTimerRef.current) clearTimeout(appliedTimerRef.current);
    appliedTimerRef.current = setTimeout(() => setLastAppliedId(null), 1500);
  }

  function toggleTag(tag: AnyTag) {
    setActiveTag((current) => (current === tag ? null : tag));
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    if (!supportedImageTypes.has(file.type) || file.size > maxImageSize) {
      setUploadError(t("ui.palette.uploadError"));
      return;
    }
    try {
      const colors = await extractImageColors(file);
      setImageCandidates([{ _id: `image_${Date.now()}`, name: file.name.replace(/\.[^.]+$/, "").slice(0, 32) || "Image", colors, tags: [] }]);
      setUploadError(null);
    } catch {
      setUploadError(t("ui.palette.uploadError"));
    }
  }

  return (
    <OverlayShell open={open} closeLabel={t("ui.browser.close")} panelClassName="xl:grid-cols-[220px_minmax(0,1fr)]" onClose={onClose}>
        {/* ── Left aside ── */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-b border-[var(--line)] p-4 xl:border-b-0 xl:border-r">
          <div className="text-[18px] font-black leading-tight">{t("ui.palette.title")}</div>
          <p className="text-[11px] font-bold leading-5 text-[var(--muted)]">{t("ui.palette.applyHint")}</p>
          <label className="grid cursor-pointer place-items-center rounded-[8px] border border-dashed border-[var(--line)] bg-[var(--soft)] px-3 py-4 text-center transition hover:border-[var(--ink)]">
            <ImageUp className="mb-1.5 size-5 text-[var(--muted)]" />
            <span className="text-[12px] font-black">{t("ui.palette.upload")}</span>
            <span className="mt-1 text-[10px] font-bold leading-4 text-[var(--muted)]">{t("ui.palette.uploadHint")}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only"
              onChange={(e) => { void uploadImage(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
          </label>
          {uploadError && <p className="text-[11px] font-bold text-red-600">{uploadError}</p>}
        </aside>

        {/* ── Right: filters + grid ── */}
        <section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">

          {/* Filter bar；pr-14 给外壳右上角的关闭按钮留位 */}
          <div className="min-w-0 border-b border-[var(--line)] py-3 pl-4 pr-14 space-y-2">
            {activeTag && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--muted)]">{t("ui.filter.all")}:</span>
                <button type="button" onClick={() => setActiveTag(null)}
                  className="flex h-8 items-center gap-1 whitespace-nowrap rounded-full bg-[var(--accent)] px-3 text-[11px] font-bold text-white">
                  {translateTag(activeTag, t)} ×
                </button>
              </div>
            )}
            <CategoryRow label={t("ui.palette.catStyle")} tags={STYLE_TAGS} getLabel={(tag) => t(styleI18nKey[tag])} activeTag={activeTag} onToggle={toggleTag} />
            <CategoryRow label={t("ui.palette.catColor")} tags={COLOR_TAGS} getLabel={(tag) => t(colorI18nKey[tag])} activeTag={activeTag} onToggle={toggleTag} />
            <CategoryRow label={t("ui.palette.catInspiration")} tags={INSPIRATION_TAGS} getLabel={(tag) => t(inspirationI18nKey[tag])} activeTag={activeTag} onToggle={toggleTag} />
            <CategoryRow label={t("ui.palette.catSource")} tags={SOURCE_TAGS} getLabel={(tag) => tag} activeTag={activeTag} onToggle={toggleTag} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("ui.palette.search")}
              className="h-8 w-full rounded-full border border-[var(--line)] bg-[var(--input)] px-3 text-[12px] font-semibold outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]" />
          </div>

          {/* Palette grid */}
          <div className="min-h-0 overflow-y-auto p-4 [scrollbar-gutter:stable]">
            {imageCandidates.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 text-[11px] font-black text-[var(--muted)]">{t("ui.palette.imageCandidates")}</div>
                <PaletteGrid palettes={imageCandidates} lastAppliedId={lastAppliedId} t={t} onApply={applyPalette} />
              </div>
            )}
            {palettes.length === 0 ? (
              <div className="grid h-32 place-items-center text-[13px] font-bold text-[var(--muted)]">…</div>
            ) : filteredPalettes.length === 0 ? (
              <div className="grid h-32 place-items-center text-[13px] font-bold text-[var(--muted)]">{t("ui.browser.empty")}</div>
            ) : (
              <>
                <PaletteGrid palettes={displayedPalettes} lastAppliedId={lastAppliedId} t={t} onApply={applyPalette} />
                <div ref={sentinelRef} className="h-2" />
                {hasMore && <div className="py-4 text-center text-[12px] font-bold text-[var(--muted)]">{t("ui.palette.loadingMore")}</div>}
              </>
            )}
          </div>
        </section>
    </OverlayShell>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Figma bundle is `{source, categories, count, data}` (older dumps were a bare
// array); BairesDev bundle is `{source, count, colors, data}` with numeric ids
// and nullable names, and carries no tags — reachable via the source chip row.
async function fetchPalettes(path: string, source: PaletteSource): Promise<ColorPalette[]> {
  try {
    const raw: unknown = await fetch(withBasePath(path)).then((r) => r.json());
    const rows = Array.isArray(raw) ? raw : (raw as { data?: unknown } | null)?.data;
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row): ColorPalette[] => {
      const { _id, name, colors, tags } = (row ?? {}) as { _id?: unknown; name?: unknown; colors?: unknown; tags?: unknown };
      if (_id == null || !Array.isArray(colors)) return [];
      return [{
        _id: `${source}-${String(_id)}`,
        name: typeof name === "string" && name.trim() ? name.trim() : `Palette ${String(_id)}`,
        colors: colors.filter((c): c is string => typeof c === "string"),
        tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [],
        source,
      }];
    });
  } catch {
    return [];
  }
}

function translateTag(tag: string, t: Translator): string {
  if (tag in styleI18nKey) return t(styleI18nKey[tag as StyleTag]);
  if (tag in colorI18nKey) return t(colorI18nKey[tag as ColorTag]);
  if (tag in inspirationI18nKey) return t(inspirationI18nKey[tag as InspirationTag]);
  return tag;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryRow<T extends string>({
  label,
  tags,
  getLabel,
  activeTag,
  onToggle,
}: {
  label: string;
  tags: readonly T[];
  getLabel: (tag: T) => string;
  activeTag: string | null;
  onToggle: (tag: T) => void;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`h-8 whitespace-nowrap rounded-full px-3 text-[11px] font-bold transition ${
              activeTag === tag ? "bg-[var(--ink)] text-[var(--panel)]" : "bg-[var(--soft)] text-[var(--ink)]"
            }`}
          >
            {getLabel(tag)}
          </button>
        ))}
      </div>
    </div>
  );
}

function PaletteGrid({
  palettes,
  lastAppliedId,
  t,
  onApply,
}: {
  palettes: ColorPalette[];
  lastAppliedId: string | null;
  t: Translator;
  onApply: (p: ColorPalette) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {palettes.map((p) => {
        const applied = lastAppliedId === p._id;
        return (
          <button
            key={p._id}
            type="button"
            onClick={() => onApply(p)}
            className="overflow-hidden rounded-[8px] border border-[var(--line)] bg-[var(--panel)] text-left transition hover:border-[var(--ink)]"
          >
            <PaletteStrip colors={p.colors} />
            <div className="flex items-center justify-between gap-2 p-2.5">
              <div className="min-w-0">
                <div className="truncate text-[12px] font-black">{p.name}</div>
                <div className="mt-0.5 font-mono text-[9px] font-bold text-[var(--muted)]">{p.colors.slice(0, 5).join(" ")}</div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                applied ? "bg-green-500 text-white" : "bg-[var(--soft)] text-[var(--ink)]"
              }`}>
                {applied ? "✓" : t("ui.palette.use")}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PaletteStrip({ colors }: { colors: string[] }) {
  return (
    <div className="grid h-[64px] overflow-hidden rounded-t-[8px]"
      style={{ gridTemplateColumns: `repeat(${Math.max(colors.length, 1)}, minmax(0, 1fr))` }}>
      {colors.map((color, i) => <span key={`${color}-${i}`} style={{ backgroundColor: color }} />)}
    </div>
  );
}

// ── Image palette extraction ──────────────────────────────────────────────────

async function extractImageColors(file: File): Promise<string[]> {
  const image = await createImageBitmap(file);
  const w = 80;
  const h = Math.max(1, Math.round((image.height / image.width) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const counts = new Map<string, number>();
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 180) continue;
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `#${hex(r)}${hex(g)}${hex(b)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const colors = pickDistinctPaletteColors(ranked, 6);
  if (colors.length === 0) throw new Error("No colors");
  return colors;
}

function hex(v: number) {
  return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
}
