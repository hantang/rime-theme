import { hexToRgb } from "./color-math";

// weasel label_format："%s." 之类模板，%s 为序号；无占位符时退回纯序号
export function formatWeaselLabel(format: string | undefined, index: number): string {
  const label = String(index + 1);
  if (!format || !format.includes("%s")) return label;
  return format.replaceAll("%s", label);
}

export type CandidateSegment =
  | { kind: "label" | "candidate" | "comment" }
  | { kind: "text"; text: string };

// squirrel candidate_format："[label]. [candidate] [comment]"，未识别的方括号按字面量保留
export function parseCandidateFormat(format: string | undefined): CandidateSegment[] {
  const template = format?.trim() || "[label]. [candidate] [comment]";
  const segments: CandidateSegment[] = [];
  let last = 0;
  for (const match of template.matchAll(/\[(label|candidate|comment)\]/g)) {
    if (match.index > last) segments.push({ kind: "text", text: template.slice(last, match.index) });
    segments.push({ kind: match[1] as "label" | "candidate" | "comment" });
    last = match.index + match[0].length;
  }
  if (last < template.length) segments.push({ kind: "text", text: template.slice(last) });
  return segments;
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

// CSS px = pt × 96/72
export function ptToPx(pt: number): number {
  return Math.round(pt * (96 / 72));
}
