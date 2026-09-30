import type { Plugin } from "vite";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Production builds keep only receipts a human has reviewed: unreviewed text
// never reaches shipped JavaScript, and their pre-rendered voice files are
// removed from the output too. Dev keeps everything for checking.

interface Receipt {
  id: string;
  review?: { by?: string; at?: string };
}
const isReviewed = (c: Receipt) => Boolean(c.review?.by?.trim() && c.review?.at?.trim());

export function reviewedReceiptsOnly(): Plugin {
  let root = "";
  let outDir = "";
  return {
    name: "reviewed-receipts-only",
    apply: "build",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    transform(code, id) {
      if (!id.split("?")[0].endsWith("/src/catalog/text-clips.json")) return;
      const reviewed = (JSON.parse(code) as Receipt[]).filter(isReviewed);
      return { code: JSON.stringify(reviewed), map: null };
    },
    closeBundle() {
      const manifestPath = join(outDir, "voices", "manifest.json");
      if (!existsSync(manifestPath)) return;
      const receipts = JSON.parse(readFileSync(join(root, "src/catalog/text-clips.json"), "utf8")) as Receipt[];
      const prefixes = receipts.filter((c) => !isReviewed(c)).map((c) => `voices/receipt.${c.id}.`);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { takes: Record<string, { file: string }> };
      const dropped = new Set<string>();
      for (const [key, take] of Object.entries(manifest.takes)) {
        if (prefixes.some((p) => take.file.startsWith(p))) {
          dropped.add(take.file);
          delete manifest.takes[key];
        }
      }
      for (const file of dropped) rmSync(join(outDir, file), { force: true });
      writeFileSync(manifestPath, JSON.stringify(manifest) + "\n");
    },
  };
}
