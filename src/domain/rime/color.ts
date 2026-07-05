import type { RimeColorFormat } from "./model";

export function rimeColorToCssHex(value: string | undefined, format: RimeColorFormat = "abgr") {
  if (!value) return null;
  const raw = value.trim();
  const rime = raw.match(/^0x([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (!rime) return null;
  const hex = rime[1];
  const rgb = hex.length === 8 ? stripAlpha(hex, format) : hex;
  return formatRgb(rgb, format);
}

export function cssHexToRimeColor(value: string, format: RimeColorFormat = "abgr") {
  const css = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!css) return null;
  const hex = css[1];
  const rr = hex.slice(0, 2);
  const gg = hex.slice(2, 4);
  const bb = hex.slice(4, 6);
  const ordered = format === "argb" || format === "rgba" ? `${rr}${gg}${bb}` : `${bb}${gg}${rr}`;
  return `0x${ordered.toUpperCase()}`;
}

function stripAlpha(hex: string, format: RimeColorFormat) {
  if (format === "argb" || format === "abgr") return hex.slice(2);
  return hex.slice(0, 6);
}

function formatRgb(hex: string, format: RimeColorFormat) {
  if (format === "argb" || format === "rgba") return `#${hex.toLowerCase()}`;
  const bb = hex.slice(0, 2);
  const gg = hex.slice(2, 4);
  const rr = hex.slice(4, 6);
  return `#${rr}${gg}${bb}`.toLowerCase();
}
