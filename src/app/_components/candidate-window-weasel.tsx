import { formatWeaselLabel, resolveThemeColor, type RimeTheme } from "@/domain/rime";
import type { SampleSet } from "../_lib/workbench";

export type CandidateWindowProps = {
  theme: RimeTheme;
  layoutMode: "stacked" | "linear";
  textOrientation: "horizontal" | "vertical";
  sample: SampleSet;
  fontFamily: string;
  fontSize: number;
  labelFontFamily: string;
  labelFontSize?: number;
  commentFontFamily: string;
  commentFontSize?: number;
};

export function WeaselCandidateWindow({ theme, layoutMode, textOrientation, sample, fontFamily, fontSize, labelFontFamily, labelFontSize, commentFontFamily, commentFontSize }: CandidateWindowProps) {
  const { colors, style } = theme;
  const linear = layoutMode === "linear";
  const vertical = textOrientation === "vertical";

  const back = colors.backColor ?? "#ffffff";
  const text = colors.textColor ?? "#111111";
  const candidateText = colors.candidateTextColor ?? text;
  const label = colors.labelColor ?? candidateText;
  const comment = colors.commentTextColor ?? candidateText;
  const hilitedBack = colors.hilitedCandidateBackColor ?? "#333333";
  const hilitedText = colors.hilitedCandidateTextColor ?? "#ffffff";
  const hilitedLabel = resolveThemeColor(theme, "hilitedLabel", "weasel") ?? hilitedText;
  const hilitedComment = colors.hilitedCommentTextColor ?? hilitedText;
  const preeditHilitedText = colors.hilitedTextColor ?? text;

  const border = style.borderThickness ?? 1;
  const marginX = style.marginX ?? 8;
  const marginY = style.marginY ?? 8;
  const spacing = style.spacing ?? 8;
  const candidateSpacing = style.candidateSpacing ?? 12;
  const hiliteSpacing = style.hiliteSpacing ?? 6;
  const hilitePadding = style.hilitePadding ?? 8;
  const shadowRadius = style.shadowRadius ?? 0;
  const showPreedit = style.inlinePreedit !== true;

  // mark 三态：mark_text 字符 → 空字符但 hilited_mark_color 非透明时 Win11 竖条 → 不画
  const markText = style.markText;
  const markColor = colors.hilitedMarkColor;
  const showTextMark = Boolean(markText);
  const showBarMark = !markText && Boolean(markColor);

  const { preedit, candidates, selection } = sample;

  return (
    <div
      style={{
        writingMode: vertical ? "vertical-rl" : undefined,
        backgroundColor: back,
        border: border > 0 ? `${border}px solid ${colors.borderColor ?? back}` : undefined,
        borderRadius: style.cornerRadius ?? 4,
        boxShadow: shadowRadius > 0 ? `${style.shadowOffsetX ?? 0}px ${style.shadowOffsetY ?? 2}px ${shadowRadius}px ${colors.shadowColor ?? "rgba(0,0,0,.35)"}` : undefined,
        padding: `${marginY}px ${marginX}px`,
        minWidth: style.minWidth,
        fontFamily,
        fontSize,
        width: "fit-content",
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {showPreedit ? (
        <div className="flex items-baseline gap-1" style={{ marginBlockEnd: spacing }}>
          {preedit.prologue ? <span style={{ color: text }}>{preedit.prologue}</span> : null}
          {preedit.highlighted ? (
            <span
              style={{
                color: preeditHilitedText,
                backgroundColor: colors.hilitedBackColor ?? "transparent",
                boxShadow: colors.hilitedShadowColor ? `0 2px 8px ${colors.hilitedShadowColor}` : undefined,
                borderRadius: 4,
                padding: "0 4px",
              }}
            >
              {preedit.highlighted}
            </span>
          ) : null}
          {preedit.postlude ? <span style={{ color: text }}>{preedit.postlude}</span> : null}
          <span className="ml-auto flex items-center gap-1 leading-none">
            <span style={{ color: colors.prevpageColor ?? comment }}>◂</span>
            <span style={{ color: colors.nextpageColor ?? comment }}>▸</span>
          </span>
        </div>
      ) : null}
      <div className="flex" style={{ flexDirection: linear ? "row" : "column", flexWrap: linear ? "wrap" : undefined, alignItems: linear ? "stretch" : undefined, gap: candidateSpacing }}>
        {candidates.map((entry, index) => {
          const active = index === selection;
          return (
            <div
              key={`${entry.candidate}-${index}`}
              className="flex items-center"
              style={{
                gap: hiliteSpacing,
                padding: hilitePadding,
                backgroundColor: active ? hilitedBack : colors.candidateBackColor,
                borderRadius: style.hilitedCornerRadius ?? 4,
                border: active
                  ? colors.hilitedCandidateBorderColor
                    ? `1px solid ${colors.hilitedCandidateBorderColor}`
                    : undefined
                  : colors.candidateBorderColor
                    ? `1px solid ${colors.candidateBorderColor}`
                    : undefined,
                boxShadow: active
                  ? colors.hilitedCandidateShadowColor
                    ? `0 2px 8px ${colors.hilitedCandidateShadowColor}`
                    : undefined
                  : colors.candidateShadowColor
                    ? `0 2px 8px ${colors.candidateShadowColor}`
                    : undefined,
              }}
            >
              {active && showTextMark ? <span style={{ color: markColor ?? hilitedText }}>{markText}</span> : null}
              {active && showBarMark ? <span className="w-[3px] self-stretch rounded-full" style={{ backgroundColor: markColor }} /> : null}
              <span style={{ color: active ? hilitedLabel : label, fontFamily: labelFontFamily, fontSize: labelFontSize ?? "0.78em" }}>{formatWeaselLabel(style.labelFormat, index)}</span>
              <span style={{ color: active ? hilitedText : candidateText }}>{entry.candidate}</span>
              {entry.comment ? <span style={{ color: active ? hilitedComment : comment, fontFamily: commentFontFamily, fontSize: commentFontSize ?? "0.7em" }}>{entry.comment}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
