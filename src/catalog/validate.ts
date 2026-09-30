import type { Clip, FictionalClip, RealClip, TextClip, TextMedium } from "../types.ts";
import { CATEGORY_IDS } from "./categories.ts";

// The provenance gate. A real clip that fails any check here never reaches the
// wheel. Shared by the app (at load) and scripts/validate-catalog.ts (in CI).

const AUDIO_EXTENSIONS = [".m4a", ".aac", ".mp3", ".opus", ".ogg", ".webm", ".wav"];
const MAX_EXCERPT_MS = 15_000;
const MIN_EXCERPT_MS = 300;

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

function checkCommon(clip: Clip, errors: string[]) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(clip.id)) errors.push("id must be lowercase letters, digits and dashes");
  if (!CATEGORY_IDS.includes(clip.category)) errors.push(`unknown category "${clip.category}"`);
  if (!(clip.absurdity >= 0 && clip.absurdity <= 100)) errors.push("absurdity must be 0–100");
  if (!clip.topic?.trim()) errors.push("topic is required");
  const decoys = clip.decoyTopics ?? [];
  if (decoys.length !== 3 || decoys.some((d) => !d?.trim())) errors.push("decoyTopics needs exactly three entries");
  if (new Set([clip.topic, ...decoys]).size !== 4) errors.push("topic and decoyTopics must all differ");
}

/** Each text must appear inside the one before it, as one unbroken run. */
function checkNestedText(texts: string[], errors: string[], what: string) {
  let lo = 0;
  let hi = texts[0].length;
  for (let i = 1; i < texts.length; i++) {
    const at = texts[0].indexOf(texts[i], lo);
    if (at < 0 || at + texts[i].length > hi) {
      errors.push(`${what} ${i} is not a contiguous cut of the step before it: "${texts[i]}"`);
      return;
    }
    lo = at;
    hi = at + texts[i].length;
  }
}

export function validateFictional(clip: FictionalClip, speakerIds: string[]): ValidationResult {
  const errors: string[] = [];
  checkCommon(clip, errors);
  if (!speakerIds.includes(clip.speakerId)) errors.push(`unknown fictional speaker "${clip.speakerId}"`);
  if (!clip.fullContext?.trim()) errors.push("fullContext is required");
  if (!clip.stages?.length) errors.push("stages needs at least one cut");
  else checkNestedText([clip.fullContext, ...clip.stages], errors, "stage");
  return { errors, warnings: [] };
}

export function validateReal(
  clip: RealClip,
  fileExists?: (publicPath: string) => boolean,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  checkCommon(clip, errors);

  for (const key of ["speaker", "companyAtTime", "archetype", "contextTranscript", "quoteExact", "sourceTitle"] as const) {
    if (!clip[key]?.trim()) errors.push(`${key} is required`);
  }

  try {
    const url = new URL(clip.sourceUrl);
    if (url.protocol !== "https:") errors.push("sourceUrl must be https");
  } catch {
    errors.push("sourceUrl is not a valid URL");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(clip.sourceDate ?? "") || Number.isNaN(Date.parse(clip.sourceDate))) {
    errors.push("sourceDate must be YYYY-MM-DD");
  } else if (Date.parse(clip.sourceDate) > Date.now()) {
    errors.push("sourceDate is in the future");
  }

  if (!(clip.sourceOffsetMs >= 0)) errors.push("sourceOffsetMs must be ≥ 0");

  const file = clip.audioFile ?? "";
  if (!file || file.startsWith("/") || file.includes("..")) errors.push("audioFile must be a relative path inside public/");
  else if (!AUDIO_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext))) errors.push(`audioFile must end in one of ${AUDIO_EXTENSIONS.join(" ")}`);
  else if (fileExists && !fileExists(file)) errors.push(`audio file not found: public/${file}`);

  const excerptMs = clip.endTimeMs - clip.startTimeMs;
  if (!(clip.startTimeMs >= 0) || !(excerptMs > 0)) errors.push("startTimeMs/endTimeMs must be ascending and ≥ 0");
  else if (excerptMs < MIN_EXCERPT_MS) errors.push(`excerpt is shorter than ${MIN_EXCERPT_MS} ms`);
  else if (excerptMs > MAX_EXCERPT_MS) errors.push(`excerpt is longer than ${MAX_EXCERPT_MS / 1000} s; cut it shorter`);

  // Time windows must nest: each stage inside the one before, the excerpt inside the last.
  const windows = [...(clip.stages ?? []), { startMs: clip.startTimeMs, endMs: clip.endTimeMs, text: clip.quoteExact }];
  let lo = 0;
  let hi = Infinity;
  windows.forEach((w, i) => {
    if (!(w.startMs >= lo && w.endMs <= hi && w.startMs < w.endMs)) {
      errors.push(i === windows.length - 1 ? "excerpt window is outside the last stage window" : `stage ${i + 1} window is outside the window before it`);
    }
    lo = w.startMs;
    hi = w.endMs;
  });

  if (clip.contextTranscript && clip.quoteExact) {
    checkNestedText([clip.contextTranscript, ...windows.map((w) => w.text)], errors, "transcript step");
  }

  if (!clip.review?.by?.trim() || !clip.review?.at?.trim()) {
    errors.push("review.by and review.at are required: someone must listen and confirm the transcript");
  }

  if (clip.contextTranscript && clip.contextTranscript.split(/\s+/).length < 25) {
    warnings.push("context transcript is under 25 words; Context Restoration will feel thin");
  }
  return { errors, warnings };
}

const TEXT_MEDIA: TextMedium[] = ["tweet", "post", "im", "email", "filing", "letter", "blog", "memo"];
// Records that don't disappear, so a separate archive snapshot is optional.
const PERMANENT_HOSTS = ["www.sec.gov", "sec.gov"];
const ARCHIVE_HOSTS = ["web.archive.org", "archive.org", "archive.ph", "archive.today", "archive.is", "ghostarchive.org", "perma.cc"];

function httpsUrl(value: string | undefined): URL | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Missing review is reported separately so tools can show "awaiting review". */
export const REVIEW_MISSING = "review.by and review.at are required: someone must open the source and archive and confirm every character";

export function validateText(clip: TextClip): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  checkCommon(clip, errors);

  for (const key of ["speaker", "companyAtTime", "archetype", "contextText", "quoteExact", "sourceTitle"] as const) {
    if (!clip[key]?.trim()) errors.push(`${key} is required`);
  }
  if (!TEXT_MEDIA.includes(clip.medium)) errors.push(`medium must be one of ${TEXT_MEDIA.join(", ")}`);

  const source = httpsUrl(clip.sourceUrl);
  if (!source) errors.push("sourceUrl must be a valid https URL");
  const permanent = source && PERMANENT_HOSTS.includes(source.hostname);
  if (clip.archiveUrl) {
    const archive = httpsUrl(clip.archiveUrl);
    if (!archive) errors.push("archiveUrl must be a valid https URL");
    else if (!ARCHIVE_HOSTS.includes(archive.hostname)) warnings.push(`archiveUrl is not on a known archive (${ARCHIVE_HOSTS.join(", ")})`);
  } else if (!permanent) {
    errors.push("archiveUrl is required: tweets and posts get deleted, so link a snapshot (e.g. web.archive.org)");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(clip.sourceDate ?? "") || Number.isNaN(Date.parse(clip.sourceDate))) {
    errors.push("sourceDate must be YYYY-MM-DD");
  } else if (Date.parse(clip.sourceDate) > Date.now()) {
    errors.push("sourceDate is in the future");
  }

  if (clip.contextText && clip.quoteExact) {
    checkNestedText([clip.contextText, ...(clip.stages ?? []), clip.quoteExact], errors, "cut");
  }
  if (!clip.review?.by?.trim() || !clip.review?.at?.trim()) errors.push(REVIEW_MISSING);
  return { errors, warnings };
}

export interface CatalogReport<T = RealClip> {
  accepted: T[];
  rejected: { id: string; errors: string[] }[];
  warnings: { id: string; warnings: string[] }[];
}

export interface TextReport extends CatalogReport<TextClip> {
  /** Pass every check except the human review. Dev builds show them, marked. */
  awaitingReview: TextClip[];
}

export function vetTextClips(clips: TextClip[], takenIds: Set<string>): TextReport {
  const report: TextReport = { accepted: [], rejected: [], warnings: [], awaitingReview: [] };
  const seen = new Set(takenIds);
  for (const clip of clips) {
    const { errors, warnings } =
      clip?.kind === "text" ? validateText(clip) : { errors: ['kind must be "text"'], warnings: [] };
    if (seen.has(clip?.id)) errors.push("duplicate id");
    seen.add(clip?.id);
    if (!errors.length) report.accepted.push(clip);
    else if (errors.length === 1 && errors[0] === REVIEW_MISSING) report.awaitingReview.push(clip);
    else report.rejected.push({ id: clip?.id ?? "(no id)", errors });
    if (warnings.length) report.warnings.push({ id: clip.id, warnings });
  }
  return report;
}

export function vetRealClips(
  clips: RealClip[],
  takenIds: Set<string>,
  fileExists?: (publicPath: string) => boolean,
): CatalogReport {
  const report: CatalogReport = { accepted: [], rejected: [], warnings: [] };
  const seen = new Set(takenIds);
  for (const clip of clips) {
    const { errors, warnings } =
      clip?.kind === "real" ? validateReal(clip, fileExists) : { errors: ['kind must be "real"'], warnings: [] };
    if (seen.has(clip?.id)) errors.push("duplicate id");
    seen.add(clip?.id);
    if (errors.length) report.rejected.push({ id: clip?.id ?? "(no id)", errors });
    else report.accepted.push(clip);
    if (warnings.length) report.warnings.push({ id: clip.id, warnings });
  }
  return report;
}
