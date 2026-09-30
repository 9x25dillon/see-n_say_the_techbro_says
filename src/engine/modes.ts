import type { CategoryId, SynergyRole } from "../types.ts";
import { isRealPerson, type ClipView } from "./clip-view.ts";
import { FICTIONAL_SPEAKERS } from "../catalog/speakers.ts";
import {
  MADLIB_CONNECTORS,
  MADLIB_OBJECTS,
  MADLIB_OPENERS,
  MADLIB_OUTCOMES,
  MADLIB_VERBS,
} from "../catalog/madlibs.ts";
import { pick, shuffle, weightedPick } from "./rng.ts";

export type ModeId = "classic" | "annihilator" | "synergy" | "madlibs" | "whosaid" | "restore" | "afterdark";

export interface ModeInfo {
  id: ModeId;
  label: string;
  title: string;
  blurb: string;
}

export const MODES: ModeInfo[] = [
  { id: "classic", label: "Classic", title: "Classic", blurb: "Pull the lever. A founder says something. Context sold separately." },
  { id: "annihilator", label: "Annihilator", title: "Context Annihilator", blurb: "Start with the whole quote, then keep cutting until it means something terrible." },
  { id: "synergy", label: "Synergy", title: "Synergy Mode", blurb: "Three separate clips from three executives who were not talking to each other." },
  { id: "madlibs", label: "Mad Libs", title: "Corporate Mad Libs", blurb: "Fictional executives only, so splicing is allowed. Every seam stays visible." },
  { id: "whosaid", label: "Who Said It", title: "Who Said That?", blurb: "Hear the line. Name the executive." },
  { id: "restore", label: "Restore", title: "Context Restoration", blurb: "Hear the excerpt. Guess what they were really talking about." },
  { id: "afterdark", label: "After Dark", title: "Earnings Call After Dark", blurb: "Only things said to analysts on the record. The line is open." },
];

export interface SpeakerChoice {
  key: string;
  name: string;
  archetype: string;
  company: string;
}

export interface MadLibPiece {
  text: string;
  speakerId: string;
}

const RECENT_MEMORY = 10;

/** Draws clips for each mode, remembering recent picks so repeats stay rare. */
export class Deck {
  private recent: string[] = [];
  private views: ClipView[];

  constructor(views: ClipView[]) {
    this.views = views;
  }

  pool(mode: ModeId): ClipView[] {
    switch (mode) {
      case "annihilator":
        return this.views.filter((v) => v.steps.length >= 3);
      case "afterdark":
        return this.views.filter((v) => v.clip.tags?.includes("earnings-call"));
      case "whosaid":
        return this.views.filter((v) => this.speakersLike(v).length >= 4);
      case "madlibs":
        return [];
      default:
        return this.views;
    }
  }

  categoriesFor(mode: ModeId): Set<CategoryId> {
    return new Set(this.pool(mode).map((v) => v.clip.category));
  }

  /** A category for the pointer: the aimed one if it has clips, else a random populated one. */
  chooseCategory(mode: ModeId, aimed?: CategoryId): CategoryId {
    const available = this.categoriesFor(mode);
    if (aimed && available.has(aimed)) return aimed;
    return pick([...available]);
  }

  draw(mode: ModeId, category?: CategoryId): ClipView {
    let pool = this.pool(mode);
    if (category) pool = pool.filter((v) => v.clip.category === category);
    const fresh = pool.filter((v) => !this.recent.includes(v.clip.id));
    const view = weightedPick(fresh.length ? fresh : pool, (v) => 20 + v.clip.absurdity);
    this.remember(view);
    return view;
  }

  /** Opener, middle and closer from three different speakers. */
  synergy(): ClipView[] {
    const chosen: ClipView[] = [];
    for (const role of ["open", "mid", "close"] as SynergyRole[]) {
      const usedSpeakers = new Set(chosen.map((v) => v.speakerKey));
      const candidates = this.views.filter((v) => !usedSpeakers.has(v.speakerKey) && !chosen.includes(v));
      const tagged = candidates.filter((v) => v.clip.tags?.includes(`synergy:${role}`));
      const fresh = tagged.filter((v) => !this.recent.includes(v.clip.id));
      const view = pick(fresh.length ? fresh : tagged.length ? tagged : candidates);
      this.remember(view);
      chosen.push(view);
    }
    return chosen;
  }

  /** One more fragment from someone other than the current speakers, for MAKE IT WORSE. */
  followUp(exclude: ClipView[]): ClipView {
    const speakers = new Set(exclude.map((v) => v.speakerKey));
    const notYet = this.views.filter((v) => !speakers.has(v.speakerKey));
    // Stay with the same kind of source as the first clip when possible.
    const sameKind = notYet.filter((v) => exclude[0] && isRealPerson(v) === isRealPerson(exclude[0]));
    const others = sameKind.length ? sameKind : notYet;
    const closers = others.filter((v) => v.clip.tags?.some((t) => t.startsWith("synergy:")));
    const view = pick(closers.length ? closers : others.length ? others : this.views);
    this.remember(view);
    return view;
  }

  whoSaidChoices(view: ClipView): SpeakerChoice[] {
    const others = shuffle(this.speakersLike(view).filter((s) => s.key !== view.speakerKey)).slice(0, 3);
    return shuffle([...others, speakerChoice(view)]);
  }

  /** Speakers from the same world as this clip: real people, or invented executives. Never mixed. */
  private speakersLike(view: ClipView): SpeakerChoice[] {
    const real = isRealPerson(view);
    const byKey = new Map<string, SpeakerChoice>();
    for (const v of this.views) if (isRealPerson(v) === real && !byKey.has(v.speakerKey)) byKey.set(v.speakerKey, speakerChoice(v));
    return [...byKey.values()];
  }

  private remember(view: ClipView) {
    this.recent = [view.clip.id, ...this.recent.filter((id) => id !== view.clip.id)].slice(0, RECENT_MEMORY);
  }
}

function speakerChoice(v: ClipView): SpeakerChoice {
  return { key: v.speakerKey, name: v.name, archetype: v.archetype, company: v.company };
}

export function topicChoices(view: ClipView): { topic: string; correct: boolean }[] {
  return shuffle([
    { topic: view.clip.topic, correct: true },
    ...view.clip.decoyTopics.map((topic) => ({ topic, correct: false })),
  ]);
}

/** Splices a sentence from fictional "recordings", one speaker per piece where possible. */
export function buildMadLib(): MadLibPiece[] {
  const verb = pick(MADLIB_VERBS);
  const texts = [
    pick(MADLIB_OPENERS),
    verb.pre,
    pick(MADLIB_OBJECTS),
    ...(verb.post ? [verb.post] : []),
    pick(MADLIB_CONNECTORS),
    pick(MADLIB_OUTCOMES),
  ];
  const speakers = shuffle(FICTIONAL_SPEAKERS);
  return texts.map((text, i) => ({ text, speakerId: speakers[i % speakers.length].id }));
}
