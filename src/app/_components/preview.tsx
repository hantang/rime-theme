import { Maximize2, Minus, Plus } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { orderLightDark, ptToPx, type Platform, type PreviewLayout, type RimeTheme } from "@/domain/rime";
import type { makeTranslator } from "@/i18n/messages";
import { getThemeSwatches } from "@/data/resources";
import { PlainMeta, RangeField, SelectField, Segmented } from "./controls";
import { WeaselCandidateWindow } from "./candidate-window-weasel";
import { SquirrelCandidateWindow } from "./candidate-window-squirrel";
import { commonFontStacks, type PreviewBackground, type PreviewBoard, type SampleSet, type SampleSetKey } from "../_lib/workbench";

type Translator = ReturnType<typeof makeTranslator>;

const MIN_ZOOM = 25;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;

// 预览缩放控件：候选很多/字体很大/竖排等情况下内容可能超出画布，之前会把外层容器一起撑大（"伸展"）；
// 画布容器改为固定高度 + overflow-hidden 后内容不再撑高外层，这里再叠加一个可缩放的浮层供用户手动缩小/适配查看
function ZoomControl({ zoom, onZoomOut, onZoomIn, onReset, onFit, t }: { zoom: number; onZoomOut: () => void; onZoomIn: () => void; onReset: () => void; onFit: () => void; t: Translator }) {
  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-1 shadow-lg">
      <button type="button" title={t("ui.preview.zoomOut")} aria-label={t("ui.preview.zoomOut")} onClick={onZoomOut} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink)] hover:bg-[var(--soft)]">
        <Minus className="size-[18px]" />
      </button>
      <button type="button" title={t("ui.preview.zoomReset")} aria-label={t("ui.preview.zoomReset")} onClick={onReset} className="h-8 min-w-[48px] shrink-0 select-none whitespace-nowrap rounded-full px-2 text-[11px] font-bold text-[var(--ink)] hover:bg-[var(--soft)]">
        {zoom}%
      </button>
      <button type="button" title={t("ui.preview.zoomIn")} aria-label={t("ui.preview.zoomIn")} onClick={onZoomIn} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink)] hover:bg-[var(--soft)]">
        <Plus className="size-[18px]" />
      </button>
      <div className="mx-0.5 h-6 w-px shrink-0 bg-[var(--line)]" />
      <button type="button" title={t("ui.preview.zoomFit")} aria-label={t("ui.preview.zoomFit")} onClick={onFit} className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--ink)] hover:bg-[var(--soft)]">
        <Maximize2 className="size-[18px]" />
      </button>
    </div>
  );
}

// 缩放状态与"适配画布"测量逻辑；fitKey 变化（如切换单一/网格/明暗板）时自动重新适配一次，避免大内容把画布撑开
function usePreviewZoom(fitKey: string) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);

  const fitToScreen = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const scaleX = viewport.clientWidth / content.offsetWidth;
    const scaleY = viewport.clientHeight / content.offsetHeight;
    const next = Math.min(scaleX, scaleY) * 100;
    if (Number.isFinite(next) && next > 0) setZoom(Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))));
  }, []);

  useEffect(() => {
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return {
    viewportRef,
    contentRef,
    zoom,
    zoomOut: () => setZoom((current) => Math.max(MIN_ZOOM, current - ZOOM_STEP)),
    zoomIn: () => setZoom((current) => Math.min(MAX_ZOOM, current + ZOOM_STEP)),
    reset: () => setZoom(100),
    fit: fitToScreen,
  };
}

export function PreviewCanvas({
  t,
  theme,
  layout,
  platform,
  sample,
  previewBackground,
  previewFontSize,
  sampleKey,
  setSampleKey,
  sampleCount,
  setSampleCount,
  sampleSelection,
  setSampleSelection,
  setPreviewBackground,
  previewBoard,
  setPreviewBoard,
  lightDarkPair,
  onGenerateVariant,
}: {
  t: Translator;
  theme: RimeTheme;
  layout: PreviewLayout;
  platform: Platform;
  sample: SampleSet;
  previewBackground: PreviewBackground;
  previewFontSize: number;
  sampleKey: SampleSetKey;
  setSampleKey: (sample: SampleSetKey) => void;
  sampleCount: number;
  setSampleCount: (count: number) => void;
  sampleSelection: number;
  setSampleSelection: (selection: number) => void;
  setPreviewBackground: (background: PreviewBackground) => void;
  previewBoard: PreviewBoard;
  setPreviewBoard: (board: PreviewBoard) => void;
  lightDarkPair: RimeTheme | null;
  onGenerateVariant: () => void;
}) {
  const canvasBackground = getCanvasBackground(previewBackground);
  const { viewportRef, contentRef, zoom, zoomOut, zoomIn, reset, fit } = usePreviewZoom(`${previewBoard}:${platform}:${theme.id}`);

  return (
    <section className="relative flex min-h-[480px] flex-col overflow-hidden p-3 xl:min-h-[560px] xl:p-5" style={{ background: "var(--canvas)" }}>
      <div className="mb-2">
        <div className="text-[10px] font-bold uppercase text-[var(--muted)]">{t("ui.preview.title")}</div>
        <div className="mt-0.5 text-[17px] font-black">{theme.name}</div>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <SelectField label={t("ui.control.sample")} value={sampleKey} onChange={(value) => setSampleKey(value as SampleSetKey)} items={[["chars", t("data.sample.chars")], ["words", t("data.sample.words")], ["sentences", t("data.sample.sentences")], ["mixed", t("data.sample.mixed")]]} />
        <RangeField label={t("ui.control.sampleCount")} value={sampleCount} min={1} max={10} onChange={setSampleCount} />
        <RangeField label={t("ui.control.sampleSelection")} value={sampleSelection} min={0} max={sampleCount - 1} onChange={setSampleSelection} />
        <SelectField label={t("ui.control.background")} value={previewBackground} onChange={(value) => setPreviewBackground(value as PreviewBackground)} items={[["default", t("ui.background.default")], ["dark", t("ui.background.dark")], ["transparent", t("ui.background.transparent")]]} />
        <Segmented items={[["single", t("ui.board.single")], ["layout", t("ui.board.layout")], ["lightDark", t("ui.board.lightDark")]]} value={previewBoard} onChange={(value) => setPreviewBoard(value as PreviewBoard)} />
      </div>
      <div
        ref={viewportRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-[8px] border border-[var(--line)] p-4"
        style={{
          background: canvasBackground,
          backgroundPosition: previewBackground === "transparent" ? "0 0, 0 10px, 10px -10px, -10px 0" : undefined,
          backgroundSize: previewBackground === "transparent" ? "20px 20px" : undefined,
        }}
      >
        <div ref={contentRef} style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}>
          {previewBoard === "single" ? (
            <CandidateWindow t={t} theme={theme} layout={layout} platform={platform} sample={sample} previewFontSize={previewFontSize} />
          ) : previewBoard === "layout" ? (
            <LayoutBoard t={t} theme={theme} platform={platform} sample={sample} previewFontSize={previewFontSize} />
          ) : (
            <LightDarkBoard t={t} theme={theme} pair={lightDarkPair} layout={layout} platform={platform} sample={sample} previewFontSize={previewFontSize} onGenerate={onGenerateVariant} />
          )}
        </div>
        <ZoomControl zoom={zoom} onZoomOut={zoomOut} onZoomIn={zoomIn} onReset={reset} onFit={fit} t={t} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {getThemeSwatches(theme).map((swatch, index) => (
          <div key={`${swatch.color}-${index}`} className="flex items-center gap-1.5">
            <span className="size-5 rounded-[4px] border border-[var(--line)]" style={{ backgroundColor: swatch.color }} />
            <span className="text-[10px] font-bold text-[var(--muted)]">{t(swatch.labelKey)}</span>
            <span className="font-mono text-[10px] font-bold text-[var(--muted)]">{swatch.color}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-3 text-[11px] font-bold text-[var(--muted)]">
        <PlainMeta label={t("ui.meta.scheme")} value={theme.id} />
        <PlainMeta label={t("ui.meta.file")} value={theme.sourceFile} />
        <PlainMeta label={t("ui.control.platform")} value={platform} />
        <PlainMeta label={t("ui.meta.tags")} value={theme.tags.join(" / ")} />
      </div>
    </section>
  );
}

// Rime font_face 本身允许写多个逗号分隔字体做级联回退（"常用字体"分类选项写入的正是这种值，真实主题文件也常见）；
// 必须逐个拆分再加引号，不能把整串逗号列表当成一个字体名整体加引号，否则 CSS 会解析成一个不存在的字体名，静默回退到最后的兜底栈
function toFontFamily(rawFontFace: string | undefined, fallbackStack: string): string {
  if (!rawFontFace || rawFontFace.trim() === "") return fallbackStack;
  const names = rawFontFace.split(",").map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return fallbackStack;
  return `${names.map((name) => `"${name}"`).join(", ")}, ${fallbackStack}`;
}

export function CandidateWindow({
  theme,
  layout,
  platform,
  sample,
  previewFontSize,
}: {
  t: Translator;
  theme: RimeTheme;
  layout: PreviewLayout;
  platform: Platform;
  sample: SampleSet;
  previewFontSize: number;
}) {
  // candidate_list_layout（每项占一整行/列 vs 单行连续排列）与 text_orientation（是否竖排文字）是两条独立轴
  const layoutMode = (theme.style.layoutOrientation ?? layout) === "horizontal" ? "linear" : "stacked";
  const textOrientation = theme.style.textOrientation ?? "horizontal";
  const stack = commonFontStacks.system;
  const fontFamily = toFontFamily(theme.style.fontFace, stack);
  const fontSize = theme.style.fontPoint ? ptToPx(theme.style.fontPoint) : previewFontSize + 12;
  // label/comment 字体与字号未设置时回退到主字体（与 Rime 实际回退规则一致），仅在显式设置时覆盖预览里原本的缩小展示比例
  const labelFontFamily = theme.style.labelFontFace ? toFontFamily(theme.style.labelFontFace, stack) : fontFamily;
  const labelFontSize = theme.style.labelFontPoint ? ptToPx(theme.style.labelFontPoint) : undefined;
  const commentFontFamily = theme.style.commentFontFace ? toFontFamily(theme.style.commentFontFace, stack) : fontFamily;
  const commentFontSize = theme.style.commentFontPoint ? ptToPx(theme.style.commentFontPoint) : undefined;
  const shared = { theme, layoutMode, textOrientation, sample, fontFamily, fontSize, labelFontFamily, labelFontSize, commentFontFamily, commentFontSize } as const;
  return platform === "weasel" ? <WeaselCandidateWindow {...shared} /> : <SquirrelCandidateWindow {...shared} />;
}

export function getCanvasBackground(previewBackground: PreviewBackground) {
  if (previewBackground === "dark") return "#171b24";
  if (previewBackground === "transparent") return "linear-gradient(45deg, var(--soft) 25%, transparent 25%), linear-gradient(-45deg, var(--soft) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--soft) 75%), linear-gradient(-45deg, transparent 75%, var(--soft) 75%)";
  return "var(--canvas)";
}

type BoardProps = {
  t: Translator;
  theme: RimeTheme;
  platform: Platform;
  sample: SampleSet;
  previewFontSize: number;
};

function BoardCell({ label, background, children }: { label: string; background?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-[8px] border border-[var(--line)] p-3">
      <div className="text-[10px] font-black uppercase text-[var(--muted)]">{label}</div>
      <div className="flex flex-1 items-center justify-center overflow-x-auto rounded-[6px] p-3" style={{ background }}>{children}</div>
    </div>
  );
}

// spec §4.2 布局对比板：同一配色 ×（横/竖 × inline_preedit 开/关）2×2，同组件同数据
export function LayoutBoard({ t, theme, platform, sample, previewFontSize }: BoardProps) {
  const cells = [
    { orientation: "horizontal", inlinePreedit: false },
    { orientation: "horizontal", inlinePreedit: true },
    { orientation: "vertical", inlinePreedit: false },
    { orientation: "vertical", inlinePreedit: true },
  ] as const;
  return (
    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
      {cells.map((cell) => {
        const variant: RimeTheme = { ...theme, style: { ...theme.style, layoutOrientation: cell.orientation, inlinePreedit: cell.inlinePreedit } };
        return (
          <BoardCell key={`${cell.orientation}-${cell.inlinePreedit}`} label={`${t(cell.orientation === "horizontal" ? "config.styleField.layoutLinear" : "config.styleField.layoutStacked")} · ${t(cell.inlinePreedit ? "ui.board.inlineOn" : "ui.board.inlineOff")}`}>
            <CandidateWindow t={t} theme={variant} layout={cell.orientation} platform={platform} sample={sample} previewFontSize={previewFontSize} />
          </BoardCell>
        );
      })}
    </div>
  );
}

// spec §4.2 明暗对比板：配对存在时并排（亮左暗右、各自衬底），否则显示生成入口（P5 接线）
export function LightDarkBoard({ t, theme, pair, layout, platform, sample, previewFontSize, onGenerate }: BoardProps & { pair: RimeTheme | null; layout: PreviewLayout; onGenerate: () => void }) {
  if (!pair) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-[12px] font-bold text-[var(--muted)]">{t("ui.board.noPair")}</div>
        <button type="button" onClick={onGenerate} className="h-9 whitespace-nowrap rounded-full bg-[var(--ink)] px-4 text-[12px] font-black text-[var(--panel)] transition hover:opacity-85">
          {t("ui.board.generateVariant")}
        </button>
      </div>
    );
  }
  const [light, dark] = orderLightDark(theme, pair);
  const panes = [
    { key: "light", labelKey: "ui.board.light" as const, item: light, background: getCanvasBackground("default") },
    { key: "dark", labelKey: "ui.board.dark" as const, item: dark, background: getCanvasBackground("dark") },
  ];
  return (
    <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
      {panes.map((pane) => (
        <BoardCell key={pane.key} label={`${t(pane.labelKey)} · ${pane.item.name}`} background={pane.background}>
          <CandidateWindow t={t} theme={pane.item} layout={layout} platform={platform} sample={sample} previewFontSize={previewFontSize} />
        </BoardCell>
      ))}
    </div>
  );
}
