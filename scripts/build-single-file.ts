// Builds the toy as one self-contained HTML fragment (no ingest tool), for
// hosting anywhere that takes a single file. Output: dist-single/see-n-say.html
// Run with: npm run build:single

import { build } from "vite";
import { readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { reviewedReceiptsOnly } from "./vite-reviewed-only.ts";

const root = join(import.meta.dirname, "..");
const out = join(root, "dist-single");
rmSync(out, { recursive: true, force: true });

await build({
  root,
  configFile: false,
  base: "./",
  logLevel: "warn",
  plugins: [reviewedReceiptsOnly()],
  build: {
    outDir: out,
    assetsInlineLimit: 1024 * 1024,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { input: join(root, "index.html") },
  },
});

const html = readFileSync(join(out, "index.html"), "utf8");
const assets = join(out, "assets");
const files = readdirSync(assets);
const js = files.filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(assets, f), "utf8"));
const css = files.filter((f) => f.endsWith(".css")).map((f) => readFileSync(join(assets, f), "utf8"));
if (js.length !== 1) throw new Error(`expected one JS chunk, got ${js.length}`);

const title = html.match(/<title>[\s\S]*?<\/title>/)![0];
const fonts = [...html.matchAll(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/g)].map((m) => m[0]).join("\n");
const bodyInner = html
  .match(/<body[^>]*>([\s\S]*)<\/body>/)![1]
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<a[^>]*data-local-only[^>]*>[\s\S]*?<\/a>/g, "");

const page = [
  title,
  fonts,
  `<style>\n${css.join("\n")}\n</style>`,
  bodyInner.trim(),
  `<script type="module">\n${js[0].replace(/<\/script/gi, "<\\/script")}\n</script>`,
].join("\n");

const target = join(out, "see-n-say.html");
writeFileSync(target, page);
console.log(`wrote ${target} (${(page.length / 1024).toFixed(0)} KB)`);
