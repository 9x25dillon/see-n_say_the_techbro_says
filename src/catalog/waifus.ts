// Waifu Dub: every quote is performed by an anime-trope voice persona.
// These are generic tropes, not specific characters or voice actors.
//   pitch/rate   → speech synthesis, for fictional executives
//   playbackRate → how far an authentic clip is sped/pitched up (words untouched)

export interface Waifu {
  id: string;
  name: string;
  trope: string;
  pitch: number;
  rate: number;
  playbackRate: number;
}

export const WAIFUS: Waifu[] = [
  { id: "tsundere", name: "Tsundere-chan", trope: "It's not like she wanted to announce the layoffs.", pitch: 1.75, rate: 1.1, playbackRate: 1.3 },
  { id: "genki", name: "Genki-chan", trope: "Maximum energy. Maximum headcount reduction.", pitch: 2.0, rate: 1.25, playbackRate: 1.42 },
  { id: "kuudere", name: "Kuudere-san", trope: "Delivers quarterly guidance without a single emotion.", pitch: 1.4, rate: 0.85, playbackRate: 1.18 },
  { id: "ojou", name: "Ojou-sama", trope: "Old money. Ohohoho at the cap table.", pitch: 1.6, rate: 0.9, playbackRate: 1.24 },
  { id: "dandere", name: "Dandere-chan", trope: "Very shy. Somehow still controls the board.", pitch: 1.85, rate: 0.8, playbackRate: 1.33 },
  { id: "magical", name: "Magical Girl Synergy", trope: "Transforms your roadmap with the power of AI.", pitch: 2.0, rate: 1.15, playbackRate: 1.45 },
  { id: "onee", name: "Onee-san", trope: "Calm, reassuring, and definitely reading your messages.", pitch: 1.3, rate: 0.95, playbackRate: 1.15 },
  { id: "yandere", name: "Yandere-chan", trope: "Will never let you churn. Never.", pitch: 1.7, rate: 0.9, playbackRate: 1.27 },
];

// One persona per fictional executive, so every exec keeps a distinct voice.
const FICTIONAL_CASTING: Record<string, string> = {
  "fictional:moonshot": "magical",
  "fictional:loss": "kuudere",
  "fictional:funnel": "genki",
  "fictional:throughput": "tsundere",
  "fictional:ledger": "dandere",
  "fictional:alderwood": "onee",
  "fictional:graph": "yandere",
  "fictional:accrual": "ojou",
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Stable persona for a speaker. Real speakers are assigned by name. */
export function waifuFor(speakerKey: string): Waifu {
  const id = FICTIONAL_CASTING[speakerKey];
  return WAIFUS.find((w) => w.id === id) ?? WAIFUS[hash(speakerKey) % WAIFUS.length];
}
