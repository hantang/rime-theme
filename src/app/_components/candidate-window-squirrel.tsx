import { hexToRgba, parseCandidateFormat, resolveThemeColor, type CandidateFieldKind } from "@/domain/rime";
import type { CandidateWindowProps } from "./candidate-window-weasel";

export function SquirrelCandidateWindow({ theme, layoutMode, textOrientation, sample, fontFamily, fontSize, labelFontFamily, labelFontSize, commentFontFamily, commentFontSize }: CandidateWindowProps) {
  const { colors, style } = theme;
  const stacked = layoutMode === "stacked";
  const vertical = textOrientation === "vertical";

  const back = colors.backColor ?? "#ffffff";
  const text = colors.textColor ?? "#111111";
  const candidateText = colors.candidateTextColor ?? text;
  const label = colors.labelColor ?? candidateText;
  const comment = colors.commentTextColor ?? candidateText;
  const hilitedBack = colors.hilitedCandidateBackColor ?? "#333333";
  const hilitedText = colors.hilitedCandidateTextColor ?? "#ffffff";
  const hilitedLabel = resolveThemeColor(theme, "hilitedLabel", "squirrel") ?? hilitedText;
  const hilitedComment = colors.hilitedCommentTextColor ?? hilitedText;
  const preeditHilitedText = colors.hilitedTextColor ?? text;

  const border = style.borderThickness ?? 0;
  const lineSpacing = style.lineSpacing ?? 6;
  const spacing = style.spacing ?? 8;
  const translucent = style.translucency === true;
  const showPreedit = style.inlinePreedit !== true;
  const segments = parseCandidateFormat(style.candidateFormat);
  // 分页控件仅在竖排文字或堆叠布局时可见（横排 + 单行连排时原生 squirrel 不占位显示）
  const showPagingWidget = style.showPaging === true && (vertical || stacked);
  const { preedit, candidates, selection } = sample;

  const segmentColor = (kind: CandidateFieldKind, active: boolean) => {
    if (kind === "label") return active ? hilitedLabel : label;
    if (kind === "comment") return active ? hilitedComment : comment;
    return active ? hilitedText : candidateText;
  };
  const segmentFontFamily = (kind: CandidateFieldKind) => {
    if (kind === "label") return labelFontFamily;
    if (kind === "comment") return commentFontFamily;
    return undefined;
  };
  const segmentFontSize = (kind: CandidateFieldKind) => {
    if (kind === "label") return labelFontSize ?? "0.78em";
    if (kind === "comment") return commentFontSize ?? "0.78em";
    return undefined;
  };

  const box = (
    <div
      style={{
        writingMode: vertical ? "vertical-rl" : undefined,
        backgroundColor: translucent ? hexToRgba(back, 0.65) : back,
        backdropFilter: translucent ? "blur(24px) saturate(1.4)" : undefined,
        WebkitBackdropFilter: translucent ? "blur(24px) saturate(1.4)" : undefined,
        opacity: style.alpha ?? 1,
        border: border > 0 ? `${border}px solid ${colors.borderColor ?? back}` : undefined,
        borderRadius: style.cornerRadius ?? 6,
        padding: 6,
        fontFamily,
        fontSize,
        width: "fit-content",
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {showPreedit ? (
        <div
          className="flex items-baseline"
          style={{
            color: text,
            backgroundColor: colors.preeditBackColor ?? "transparent",
            borderRadius: 4,
            paddingBlock: 2,
            paddingInline: 6,
            marginBlockEnd: spacing,
          }}
        >
          {preedit.prologue ? <span>{preedit.prologue}</span> : null}
          {preedit.highlighted ? (
            <span style={{ color: preeditHilitedText, backgroundColor: colors.hilitedBackColor, borderRadius: 3, padding: "0 2px" }}>{preedit.highlighted}</span>
          ) : null}
          {/* squirrel 在光标处（高亮段之后）绘制一个下沉的插入符 */}
          {preedit.highlighted ? (
            <span aria-hidden style={{ alignSelf: "flex-end", fontSize: "0.55em", lineHeight: 1, transform: "translateY(-15%)" }}>^</span>
          ) : null}
          {preedit.postlude ? <span>{preedit.postlude}</span> : null}
        </div>
      ) : null}
      <div
        className="flex"
        style={{
          flexDirection: stacked ? "column" : "row",
          flexWrap: stacked ? undefined : "wrap",
          alignItems: stacked ? "stretch" : "center",
          gap: lineSpacing,
        }}
      >
        {candidates.map((entry, index) => {
          const active = index === selection;
          return (
            <div
              key={`${entry.candidate}-${index}`}
              className="flex items-baseline"
              style={{
                padding: "3px 8px",
                // 非高亮候选默认无背景框；candidate_back_color 设置时才绘制
                backgroundColor: active ? hilitedBack : colors.candidateBackColor,
                borderRadius: style.hilitedCornerRadius ?? 5,
                boxShadow: active && (style.shadowSize ?? 0) > 0 ? `0 2px ${style.shadowSize}px rgba(0,0,0,.3)` : undefined,
                borderBlockEnd: stacked && !active && index < candidates.length - 1 ? `1px solid ${hexToRgba(colors.borderColor ?? text, 0.15)}` : undefined,
              }}
            >
              {segments.map((segment, segmentIndex) => {
                if (segment.kind === "text") {
                  // 字面量跟随所属字段的配色与字体（如 "[label]." 的点号与序号同色同字号）
                  return (
                    <span key={segmentIndex} style={{ whiteSpace: "pre", color: segmentColor(segment.role, active), fontFamily: segmentFontFamily(segment.role), fontSize: segmentFontSize(segment.role) }}>
                      {segment.text}
                    </span>
                  );
                }
                const value = segment.kind === "label" ? String(index + 1) : segment.kind === "candidate" ? entry.candidate : entry.comment;
                if (!value) return null;
                return (
                  <span key={segmentIndex} style={{ color: segmentColor(segment.kind, active), fontFamily: segmentFontFamily(segment.kind), fontSize: segmentFontSize(segment.kind) }}>
                    {value}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!showPagingWidget) return box;

  const pagingGlyph = vertical ? (
    <span className="flex items-center gap-1 leading-none" style={{ color: comment, opacity: 0.55 }}>
      <span>◂</span>
      <span>▸</span>
    </span>
  ) : (
    <span className="flex flex-col items-center gap-0.5 leading-none" style={{ color: comment, opacity: 0.55 }}>
      <span>▲</span>
      <span>▼</span>
    </span>
  );

  return (
    <div className="flex items-center" style={{ flexDirection: vertical ? "column" : "row", gap: 8 }}>
      {pagingGlyph}
      {box}
    </div>
  );
}
