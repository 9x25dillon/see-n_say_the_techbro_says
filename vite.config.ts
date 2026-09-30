import { defineConfig } from "vite";
import { resolve } from "node:path";
import { reviewedReceiptsOnly } from "./scripts/vite-reviewed-only.ts";

export default defineConfig({
  base: "./",
  plugins: [reviewedReceiptsOnly()],
  build: {
    // Inline the narrator MP3 (~18 KB) so the single-file build carries it.
    assetsInlineLimit: 32 * 1024,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        ingest: resolve(import.meta.dirname, "ingest.html"),
      },
    },
  },
});
