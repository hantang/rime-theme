import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { parseThemeYaml } from "@/domain/resource-loader";
import type { RimeTheme } from "@/domain/rime";

const SAFE_RESOURCE_NAME = /^[A-Za-z0-9_.-]+\.ya?ml$/;
const MAX_THEMES = 500;

const resourceDir = new URL("../data/resources/", import.meta.url);
const outputDir = new URL("../public/resources/", import.meta.url);
const themesUrl = new URL("themes.json", outputDir);

await mkdir(outputDir, { recursive: true });

const entries = await readdir(resourceDir);
const fileNames = entries.filter((name) => SAFE_RESOURCE_NAME.test(name)).sort();

const themes: RimeTheme[] = [];
for (const fileName of fileNames) {
  try {
    const text = await readFile(new URL(fileName, resourceDir), "utf8");
    themes.push(...parseThemeYaml(text, `resources/${fileName}`));
  } catch (error) {
    // Best-effort: a single malformed source file shouldn't fail the whole build.
    console.warn(`build-themes: skipped ${fileName}: ${(error as Error).message}`);
  }
}

await writeFile(themesUrl, JSON.stringify(themes.slice(0, MAX_THEMES)));

console.log(`${themesUrl} written with ${themes.length} themes from ${fileNames.length} YAML files`);
