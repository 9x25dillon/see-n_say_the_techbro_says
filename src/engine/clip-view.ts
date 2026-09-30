import type { Clip } from "../types.ts";
import { speakerById } from "../catalog/speakers.ts";

/** One contiguous cut of a clip, located inside the full context. */
export interface Step {
  text: string;
  /** Character range inside ClipView.fullText. */
  start: number;
  end: number;
  /** For real clips: the matching time window inside the audio file. */
  audio?: { startMs: number; endMs: number };
}

/** A clip flattened into what the UI needs, whatever its kind. */
export interface ClipView {
  clip: Clip;
  kind: Clip["kind"];
  /** Stable per speaker; used to build Who Said That? choices. */
  speakerKey: string;
  name: string;
  title: string;
  company: string;
  archetype: string;
  bio?: string;
  voice?: { pitch: number; rate: number };
  fullText: string;
  /** Widest first: steps[0] is the full context, the last step is the excerpt. */
  steps: Step[];
  excerpt: Step;
}

export function viewOf(clip: Clip): ClipView {
  if (clip.kind === "fictional") {
    const s = speakerById(clip.speakerId);
    const steps = locate(clip.fullContext, [clip.fullContext, ...clip.stages].map((text) => ({ text })));
    return {
      clip,
      kind: "fictional",
      speakerKey: `fictional:${s.id}`,
      name: s.name,
      title: s.title,
      company: s.company,
      archetype: s.archetype,
      bio: s.bio,
      voice: s.voice,
      fullText: clip.fullContext,
      steps,
      excerpt: steps[steps.length - 1],
    };
  }

  if (clip.kind === "text") {
    const steps = locate(clip.contextText, [clip.contextText, ...(clip.stages ?? []), clip.quoteExact].map((text) => ({ text })));
    return {
      clip,
      kind: "text",
      speakerKey: `real:${clip.speaker.toLowerCase()}`,
      name: clip.speaker,
      title: "",
      company: clip.companyAtTime,
      archetype: clip.archetype.toUpperCase(),
      fullText: clip.contextText,
      steps,
      excerpt: steps[steps.length - 1],
    };
  }

  const windows = [
    { text: clip.contextTranscript, audio: undefined },
    ...(clip.stages ?? []).map((w) => ({ text: w.text, audio: { startMs: w.startMs, endMs: w.endMs } })),
    { text: clip.quoteExact, audio: { startMs: clip.startTimeMs, endMs: clip.endTimeMs } },
  ];
  // A final stage identical to the excerpt would just repeat itself.
  const deduped = windows.filter((w, i) => i === windows.length - 1 || w.text !== windows[i + 1].text);
  const steps = locate(clip.contextTranscript, deduped);
  return {
    clip,
    kind: "real",
    speakerKey: `real:${clip.speaker.toLowerCase()}`,
    name: clip.speaker,
    title: "",
    company: clip.companyAtTime,
    archetype: clip.archetype.toUpperCase(),
    fullText: clip.contextTranscript,
    steps,
    excerpt: steps[steps.length - 1],
  };
}

function locate(full: string, parts: { text: string; audio?: Step["audio"] }[]): Step[] {
  let lo = 0;
  return parts.map(({ text, audio }) => {
    const at = Math.max(0, full.indexOf(text, lo));
    lo = at;
    return { text, start: at, end: at + text.length, audio };
  });
}

/** How much of the original survives in this cut, as a whole percent (never 0). */
export function contextIntegrity(view: ClipView, step: Step): number {
  return Math.max(1, Math.round((100 * step.text.length) / view.fullText.length));
}

/** Real people (audio clips and receipts) versus the invented executives. */
export function isRealPerson(view: ClipView): boolean {
  return view.kind !== "fictional";
}

/** Timestamp link into the original source, where the platform supports one. */
export function sourceLink(view: ClipView, step: Step = view.excerpt): { href: string; stamp: string } | null {
  if (view.clip.kind !== "real") return null;
  const ms = view.clip.sourceOffsetMs + (step.audio?.startMs ?? 0);
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const stamp = h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  let href = view.clip.sourceUrl;
  try {
    const url = new URL(href);
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) {
      url.searchParams.set("t", `${totalSec}s`);
      href = url.toString();
    }
  } catch {
    /* validator already rejects bad URLs */
  }
  return { href, stamp };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
