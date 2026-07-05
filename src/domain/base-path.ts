// NEXT_PUBLIC_BASE_PATH is inlined into client bundles at build time (see
// next.config.ts). Empty when the app is served from the domain root; set to
// e.g. "/rime-theme" for GitHub Pages project sites. Hand-written fetch()
// paths must go through this helper — Next only auto-prefixes its own assets.
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  return `${basePath}${path}`;
}
