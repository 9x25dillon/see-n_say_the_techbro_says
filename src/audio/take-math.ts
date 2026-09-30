// Shared by the app and scripts/render-voices.ts: how a pre-rendered "take" is
// named, and how a cut of its text maps to a time window using the
// per-character timings ElevenLabs returns. No DOM here.

/** One pre-rendered performance of one text by one voice. Times in ms. */
export interface Take {
  /** Path relative to public/, e.g. "voices/clip-ai-optional.waifu-kuudere.mp3". */
  file: string;
  /** Where this take sits inside the file (files may hold several takes). */
  start: number;
  end: number;
  /** Per-character start/end times, relative to `start`. Present when cuts are needed. */
  cs?: number[];
  ce?: number[];
}

export interface VoiceManifest {
  version: 1;
  takes: Record<string, Take>;
}

/** FNV-1a, hex. Stable across Node and browsers. */
export function textHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function takeKey(voiceKey: string, text: string): string {
  return `${voiceKey}|${textHash(text)}`;
}

const LEAD_MS = 60; // breath before the first kept word
const TAIL_MS = 110; // let the last kept word ring out
// Voices that run words together leave the previous word's tail inside the
// "gap" the alignment reports, so padding may use only part of it.
const GAP_SHARE = 0.3;

/**
 * Time window (absolute ms in the file) for characters [from, to) of `text`.
 * Padding never crosses into a neighbouring character, so a cut that ends at
 * "kids" in "kids' education" stops before the apostrophe is spoken.
 */
export function windowOf(take: Take, text: string, from: number, to: number): { startMs: number; endMs: number } {
  const { cs, ce } = take;
  if (!cs || !ce || cs.length !== text.length) return { startMs: take.start, endMs: take.end };
  const isGap = (i: number) => /\s/.test(text[i]);
  let a = from;
  while (a < to - 1 && isGap(a)) a++;
  let b = to - 1;
  while (b > a && isGap(b)) b--;

  let prev = a - 1;
  while (prev >= 0 && isGap(prev)) prev--;
  let next = b + 1;
  while (next < text.length && isGap(next)) next++;

  const length = take.end - take.start;
  const gapBefore = prev < 0 ? 0 : Math.max(0, cs[a] - ce[prev]);
  const gapAfter = next >= text.length ? 0 : Math.max(0, cs[next] - ce[b]);
  const start = prev < 0 ? 0 : cs[a] - Math.min(LEAD_MS, gapBefore * GAP_SHARE);
  const end = next >= text.length ? length : ce[b] + Math.min(TAIL_MS, gapAfter * GAP_SHARE);
  return { startMs: take.start + Math.max(0, start), endMs: take.start + Math.min(length, Math.max(end, start + 50)) };
}
