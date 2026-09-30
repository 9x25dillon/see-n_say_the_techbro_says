// Provenance gate for CI: npm run validate
// Fails if any real clip lacks provenance or any fictional cut isn't contiguous.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RealClip, TextClip } from "../src/types.ts";
import { CATEGORIES } from "../src/catalog/categories.ts";
import { FICTIONAL_CLIPS } from "../src/catalog/fictional-clips.ts";
import { FICTIONAL_SPEAKERS } from "../src/catalog/speakers.ts";
import { validateFictional, vetRealClips, vetTextClips } from "../src/catalog/validate.ts";

const root = join(import.meta.dirname, "..");
let failed = false;

const speakerIds = FICTIONAL_SPEAKERS.map((s) => s.id);
const ids = new Set<string>();
for (const clip of FICTIONAL_CLIPS) {
  const { errors } = validateFictional(clip, speakerIds);
  if (ids.has(clip.id)) errors.push("duplicate id");
  ids.add(clip.id);
  if (errors.length) {
    failed = true;
    console.error(`✗ fictional ${clip.id}\n  - ${errors.join("\n  - ")}`);
  }
}

const realPath = join(root, "src/catalog/real-clips.json");
const real = JSON.parse(readFileSync(realPath, "utf8")) as RealClip[];
const report = vetRealClips(real, ids, (file) => existsSync(join(root, "public", file)));
for (const r of report.rejected) {
  failed = true;
  console.error(`✗ real ${r.id}\n  - ${r.errors.join("\n  - ")}`);
}
for (const w of report.warnings) console.warn(`! real ${w.id}\n  - ${w.warnings.join("\n  - ")}`);

report.accepted.forEach((c) => ids.add(c.id));
const textPath = join(root, "src/catalog/text-clips.json");
const text = JSON.parse(readFileSync(textPath, "utf8")) as TextClip[];
const receipts = vetTextClips(text, ids);
for (const r of receipts.rejected) {
  failed = true;
  console.error(`✗ receipt ${r.id}\n  - ${r.errors.join("\n  - ")}`);
}
for (const w of receipts.warnings) console.warn(`! receipt ${w.id}\n  - ${w.warnings.join("\n  - ")}`);
// Awaiting review is not a failure: production builds simply leave them out.
for (const c of receipts.awaitingReview) console.warn(`… receipt ${c.id} awaiting review (open ${c.archiveUrl ?? c.sourceUrl}, then fill review.by/at)`);

const all = [...FICTIONAL_CLIPS, ...report.accepted, ...receipts.accepted];
const perCategory = CATEGORIES.map((c) => `${c.label}: ${all.filter((x) => x.category === c.id).length}`);
const roles = ["open", "mid", "close"].map((r) => `${r} ${all.filter((x) => x.tags?.includes(`synergy:${r}` as never)).length}`);

console.log(
  `\n${FICTIONAL_CLIPS.length} fictional lines · real clips: ${report.accepted.length} accepted, ${report.rejected.length} rejected · ` +
    `receipts: ${receipts.accepted.length} accepted, ${receipts.awaitingReview.length} awaiting review, ${receipts.rejected.length} rejected.`,
);
console.log(`Per slice → ${perCategory.join(" · ")}`);
console.log(`Synergy roles → ${roles.join(" · ")}`);
console.log(`Earnings calls → ${all.filter((x) => x.tags?.includes("earnings-call")).length}`);

const empty = CATEGORIES.filter((c) => !all.some((x) => x.category === c.id));
if (empty.length) {
  failed = true;
  console.error(`✗ slices with no clips: ${empty.map((c) => c.label).join(", ")}`);
}

process.exit(failed ? 1 : 0);
