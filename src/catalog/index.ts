import type { Clip, FictionalClip, RealClip, TextClip } from "../types.ts";
import { FICTIONAL_CLIPS } from "./fictional-clips.ts";
import { FICTIONAL_SPEAKERS } from "./speakers.ts";
import { validateFictional, vetRealClips, vetTextClips, type CatalogReport, type TextReport } from "./validate.ts";
import realClipsJson from "./real-clips.json";
import textClipsJson from "./text-clips.json";

export interface Catalog {
  clips: Clip[];
  fictional: FictionalClip[];
  real: RealClip[];
  /** Receipts that passed review, plus (dev builds only) ones awaiting review. */
  text: TextClip[];
  /** Ids of receipts shown only because this is a dev build. */
  unreviewed: Set<string>;
  report: CatalogReport;
  textReport: TextReport;
}

export function loadCatalog(): Catalog {
  const speakerIds = FICTIONAL_SPEAKERS.map((s) => s.id);
  const fictional = FICTIONAL_CLIPS.filter((clip) => {
    const { errors } = validateFictional(clip, speakerIds);
    if (errors.length) console.warn(`[catalog] fictional clip ${clip.id} skipped:`, errors);
    return errors.length === 0;
  });
  const taken = new Set(fictional.map((c) => c.id));
  const report = vetRealClips(realClipsJson as RealClip[], taken);
  for (const r of report.rejected) console.warn(`[catalog] real clip ${r.id} rejected by provenance check:`, r.errors);
  report.accepted.forEach((c) => taken.add(c.id));

  const textReport = vetTextClips(textClipsJson as TextClip[], taken);
  for (const r of textReport.rejected) console.warn(`[catalog] receipt ${r.id} rejected by provenance check:`, r.errors);
  // Unreviewed receipts never ship; in dev they appear, stamped UNREVIEWED, so you can check them in context.
  const pending = import.meta.env.DEV ? textReport.awaitingReview : [];
  const text = [...textReport.accepted, ...pending];

  return {
    clips: [...report.accepted, ...text, ...fictional],
    fictional,
    real: report.accepted,
    text,
    unreviewed: new Set(pending.map((c) => c.id)),
    report,
    textReport,
  };
}
