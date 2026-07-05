import { hexToRgb } from "./color-math";

// weasel label_format："%s." 之类模板，%s 为序号；无占位符时退回纯序号
export function formatWeaselLabel(format: string | undefined, index: number): string {
  const label = String(index + 1);
  if (!format || !format.includes("%s")) return label;
  return format.replaceAll("%s", label);
}

export type CandidateFieldKind = "label" | "candidate" | "comment";

export type CandidateSegment =
  | { kind: CandidateFieldKind }
  | { kind: "text"; text: string; role: CandidateFieldKind };

// squirrel candidate_format："[label]. [candidate] [comment]"，未识别的方括号按字面量保留。
// 字面量与前面的字段视为一个整体（如 "[label]." 的点号取标签色）；开头的字面量跟随其后的字段
export function parseCandidateFormat(format: string | undefined): CandidateSegment[] {
  const template = format?.trim() || "[label]. [candidate] [comment]";
  const parts: Array<{ kind: CandidateFieldKind } | { kind: "text"; text: string }> = [];
  let last = 0;
  for (const match of template.matchAll(/\[(label|candidate|comment)\]/g)) {
    if (match.index > last) parts.push({ kind: "text", text: template.slice(last, match.index) });
    parts.push({ kind: match[1] as CandidateFieldKind });
    last = match.index + match[0].length;
  }
  if (last < template.length) parts.push({ kind: "text", text: template.slice(last) });

  const roles: Array<CandidateFieldKind | undefined> = new Array(parts.length);
  let previous: CandidateFieldKind | undefined;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].kind !== "text") previous = parts[i].kind as CandidateFieldKind;
    else roles[i] = previous;
  }
  let next: CandidateFieldKind = "candidate";
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].kind !== "text") next = parts[i].kind as CandidateFieldKind;
    else roles[i] ??= next;
  }
  return parts.map((part, i) => (part.kind === "text" ? { ...part, role: roles[i] ?? "candidate" } : part));
}

export function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

// CSS px = pt × 96/72
export function ptToPx(pt: number): number {
  return Math.round(pt * (96 / 72));
}
