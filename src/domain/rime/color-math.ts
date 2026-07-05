export type Hsl = { h: number; s: number; l: number };

export function normalizeHexColor(color: string): string | null {
  const trimmed = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) as [number, number, number];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

// 快速感知亮度（inferTags 的阈值按它调校），非 WCAG
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// WCAG 相对亮度（sRGB 线性化），只用于对比度
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function mixHex(first: string, second: string, weight: number): string {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const t = Math.max(0, Math.min(1, weight));
  return rgbToHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}

export function hslFromHex(hex: string): Hsl {
  const [rRaw, gRaw, bRaw] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(rRaw, gRaw, bRaw);
  const min = Math.min(rRaw, gRaw, bRaw);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rRaw) h = ((gRaw - bRaw) / delta + (gRaw < bRaw ? 6 : 0)) * 60;
  else if (max === gRaw) h = ((bRaw - rRaw) / delta + 2) * 60;
  else h = ((rRaw - gRaw) / delta + 4) * 60;
  return { h, s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return rgbToHex((r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255);
}

export function desaturate(hex: string, factor: number): string {
  const hsl = hslFromHex(hex);
  return hslToHex({ ...hsl, s: hsl.s * Math.max(0, Math.min(1, factor)) });
}
