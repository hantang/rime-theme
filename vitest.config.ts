import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // temp/ is a gitignored local scratch area; stray files there must not run
    exclude: ["**/node_modules/**", "temp/**"],
  },
});
