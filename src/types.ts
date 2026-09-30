// Shared data model. Pure types only: this file is imported by the web app,
// the ingest tool, and the Node validator script, so it must stay erasable.

export type CategoryId =
  | "ai"
  | "agi-doom"
  | "efficiency"
  | "future"
  | "layoffs"
  | "mars"
  | "monetization"
  | "humanity"
  | "algorithm"
  | "shareholder-value"
  | "surveillance"
  | "still-early";

/** Where a fragment sits in an accidental Synergy Mode "conversation". */
export type SynergyRole = "open" | "mid" | "close";

export type ClipTag = "earnings-call" | `synergy:${SynergyRole}`;

interface ClipBase {
  id: string;
  category: CategoryId;
  /** Curator's rating, 0–100. Higher = picked more often. */
  absurdity: number;
  /** What the speaker was actually discussing. Used by Context Restoration. */
  topic: string;
  /** Three plausible-but-wrong topics for the Context Restoration guess. */
  decoyTopics: [string, string, string];
  tags?: ClipTag[];
  /** Restoring context makes it worse, not better. Changes the reveal copy. */
  contextMakesItWorse?: boolean;
}

/**
 * An authentic recording. The audio file holds the whole context window
 * (typically 30–60 s, cut contiguously from the source); the excerpt and every
 * annihilator stage are sub-ranges of that one file. Nothing is ever spliced.
 */
export interface RealClip extends ClipBase {
  kind: "real";
  speaker: string;
  companyAtTime: string;
  /** Shown instead of the name until the player asks for the source. */
  archetype: string;
  /** Path relative to public/, e.g. "audio/some-id.m4a". */
  audioFile: string;
  /** Verbatim transcript of the whole audio file. */
  contextTranscript: string;
  /** Verbatim words spoken between startTimeMs and endTimeMs. */
  quoteExact: string;
  startTimeMs: number;
  endTimeMs: number;
  /**
   * Optional Context Annihilator steps, widest first. Each window must sit
   * inside the one before it, and each text must appear in the transcript.
   * The excerpt (startTimeMs–endTimeMs) is the implied final step.
   */
  stages?: AudioWindow[];
  sourceUrl: string;
  sourceTitle: string;
  /** ISO date, YYYY-MM-DD. */
  sourceDate: string;
  /** Where the audio file begins inside the original source, for timestamp links. */
  sourceOffsetMs: number;
  /** A human listened to the audio and confirmed quoteExact and every stage text. */
  review: { by: string; at: string };
}

export interface AudioWindow {
  startMs: number;
  endMs: number;
  text: string;
}

/**
 * A line from a fictional executive, voiced by speech synthesis. Fictional
 * lines are the only content that may be spliced (Corporate Mad Libs).
 */
export interface FictionalClip extends ClipBase {
  kind: "fictional";
  speakerId: string;
  fullContext: string;
  /**
   * Contiguous cuts of fullContext, widest first. Each must be a substring of
   * the one before it. The last one is the excerpt Classic mode plays.
   */
  stages: string[];
}

/** Where a text-only quote was originally published. */
export type TextMedium = "tweet" | "post" | "im" | "email" | "filing" | "letter" | "blog" | "memo";

/**
 * A real quote that only exists as text: a tweet, a leaked IM, an SEC filing, a
 * blog post. It is shown as a receipt (the whole original, excerpt highlighted,
 * links to the source and an archived copy) and read aloud by a performer who
 * is obviously not the speaker. Nobody's voice is imitated.
 */
export interface TextClip extends ClipBase {
  kind: "text";
  speaker: string;
  companyAtTime: string;
  archetype: string;
  medium: TextMedium;
  /** For tweets and posts, e.g. "@someone". */
  handle?: string;
  /** Verbatim text of the original, or a contiguous passage around the quote. Line breaks kept. */
  contextText: string;
  /** Verbatim excerpt; must be a contiguous piece of contextText. */
  quoteExact: string;
  /** Optional Annihilator cuts, widest first; the excerpt is the implied final step. */
  stages?: string[];
  sourceUrl: string;
  /** Snapshot that survives deletion. Optional only for permanent records such as SEC EDGAR. */
  archiveUrl?: string;
  sourceTitle: string;
  /** Publication date of the source, YYYY-MM-DD. */
  sourceDate: string;
  /** When it was actually written, if different or only approximately known ("early 2004"). */
  saidOn?: string;
  /** How we know it is genuine, when that isn't obvious (leaks, later confirmations). */
  provenanceNote?: string;
  /** A human opened the source and archive and confirmed every character. */
  review: { by: string; at: string };
}

export type Clip = RealClip | FictionalClip | TextClip;

export interface FictionalSpeaker {
  id: string;
  name: string;
  title: string;
  company: string;
  archetype: string;
  bio: string;
  voice: { pitch: number; rate: number };
}

export interface Category {
  id: CategoryId;
  label: string;
  /** Up to three short lines printed on the wheel slice. */
  wheel: string[];
  icon: IconName;
}

export type IconName =
  | "chip"
  | "skull"
  | "stopwatch"
  | "orb"
  | "slip"
  | "rocket"
  | "dollar"
  | "person"
  | "loop"
  | "chart"
  | "eye"
  | "seedling";
