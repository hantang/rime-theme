import { stringify } from "yaml";
import { colorExportKey, colorFieldMeta, resolveThemeColor, styleFieldMeta } from "./fields";
import { cssHexToRimeColor } from "./color";
import { orderLightDark } from "./variant";
import type { Platform, RimeStyleControls, RimeTheme, StyleFieldType } from "./model";

export function themeToYaml(theme: RimeTheme, platform: Platform) {
  return themesToPatchYaml([theme], platform);
}

export function themesToPatchYaml(themes: RimeTheme[], platform: Platform) {
  const lines = ["patch:"];
  for (const theme of themes) lines.push(...schemeLines(theme, platform));
  return `${lines.join("\n")}\n`;
}

// spec §6：配对导出——style/color_scheme(_dark) 引用 + 两个方案，亮色为默认；各自的 style 字段写入各自的 scheme 块
export function pairedThemesToYaml(theme: RimeTheme, pair: RimeTheme, platform: Platform) {
  const [light, dark] = orderLightDark(theme, pair);
  const lines = ["patch:", `  style/color_scheme: ${light.id}`, `  style/color_scheme_dark: ${dark.id}`];
  lines.push(...schemeLines(light, platform), ...schemeLines(dark, platform));
  return `${lines.join("\n")}\n`;
}

function schemeLines(theme: RimeTheme, platform: Platform): string[] {
  const indent = "    ";
  const lines = [
    `  preset_color_schemes/${theme.id}:`,
    `${indent}name: ${yamlStringScalar(theme.name)}`,
    `${indent}author: ${yamlStringScalar(theme.author)}`,
  ];
  if (platform === "weasel" && theme.presetColorScheme.colorFormat) {
    lines.push(`${indent}color_format: ${theme.presetColorScheme.colorFormat}`);
  }
  if (platform === "squirrel" && theme.options.colorSpace) {
    lines.push(`${indent}color_space: ${theme.options.colorSpace}`);
  }
  const colorFormat = platform === "weasel" ? theme.presetColorScheme.colorFormat : undefined;
  for (const field of colorFieldMeta) {
    if (!field.platforms.includes(platform)) continue;
    const color = resolveThemeColor(theme, field.id, platform);
    if (!color) continue;
    lines.push(`${indent}${colorExportKey(field, platform)}: ${cssHexToRimeColor(color, colorFormat) ?? color}`);
  }
  lines.push(...styleSchemeLines(theme.style, platform, indent));
  return lines;
}

// style 字段写入方案自身（而非全局 style/+），按用户要求统一两平台的写法
function styleSchemeLines(style: RimeStyleControls, platform: Platform, indent: string): string[] {
  const flat: string[] = [];
  const nested = new Map<string, string[]>();

  for (const field of styleFieldMeta) {
    if (!field.platforms.includes(platform)) continue;
    const value = style[field.id];
    if (value === undefined) continue;
    const paths = field.exportPaths[platform];
    if (!paths) continue;
    const encoded = field.encode?.[platform]?.(value) ?? formatStyleValue(value, field.type);
    for (const path of paths) {
      const [head, tail] = path.split("/");
      if (tail) {
        const bucket = nested.get(head) ?? [];
        bucket.push(`${indent}  ${tail}: ${encoded}`);
        nested.set(head, bucket);
      } else {
        flat.push(`${indent}${head}: ${encoded}`);
      }
    }
  }

  const lines = [...flat];
  for (const [head, bucket] of nested) lines.push(`${indent}${head}:`, ...bucket);
  return lines;
}

function formatStyleValue(value: string | number | boolean, type: StyleFieldType) {
  if (type === "string") return yamlStringScalar(String(value));
  return String(value);
}

// 引号策略：默认单引号；含单引号时改用双引号；换行等复杂情况交给 yaml 库转义
function yamlStringScalar(value: string): string {
  const defaultStringType = value.includes("'") ? "QUOTE_DOUBLE" : "QUOTE_SINGLE";
  return stringify(value, { defaultStringType, lineWidth: 0 }).trimEnd();
}
