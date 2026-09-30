import type { FictionalSpeaker } from "../types.ts";

// Every executive here is invented. None is a stand-in for a real person.
export const FICTIONAL_SPEAKERS: FictionalSpeaker[] = [
  {
    id: "moonshot",
    name: "Thane Moonshot",
    title: "Founder & Chief Visionary Officer",
    company: "Ascendr",
    archetype: "THE VISIONARY",
    bio: "Has described three separate products as “basically a religion.” Owns a sleep pod, a bunker, and a podcast about the bunker.",
    voice: { pitch: 0.8, rate: 0.92 },
  },
  {
    id: "loss",
    name: "Dr. Evander Loss",
    title: "CEO",
    company: "Singularity Adjacent",
    archetype: "THE AI PROPHET",
    bio: "Has predicted AGI within eighteen months every year since 2017. Raised $6B to build the thing he warns Congress about.",
    voice: { pitch: 1.0, rate: 0.85 },
  },
  {
    id: "funnel",
    name: "Kyle Funnel",
    title: "Founder",
    company: "Churnly",
    archetype: "THE GROWTH HACKER",
    bio: "Added a dark pattern to the unsubscribe page of a hospice app. Calls it retention.",
    voice: { pitch: 1.35, rate: 1.25 },
  },
  {
    id: "throughput",
    name: "Brock Throughput",
    title: "CEO",
    company: "Leanr",
    archetype: "THE EFFICIENCY GUY",
    bio: "Wakes at 3:45 a.m. Eats one blended meal a day. Laid off his own assistant with a calendar invite titled “Quick sync.”",
    voice: { pitch: 0.6, rate: 1.15 },
  },
  {
    id: "ledger",
    name: "Dax Ledger",
    title: "Founder",
    company: "WeCoin Foundation",
    archetype: "THE STILL-EARLY GUY",
    bio: "Down 94% and calling it a buying opportunity. Communicates mainly through laser-eyed profile pictures.",
    voice: { pitch: 1.2, rate: 1.1 },
  },
  {
    id: "alderwood",
    name: "Sage Alderwood",
    title: "Chief Vibes Officer",
    company: "Breathe.io",
    archetype: "THE WELLNESS FOUNDER",
    bio: "Runs a mindfulness app that sends eleven push notifications a day. Did ayahuasca once; it is now the product roadmap.",
    voice: { pitch: 1.5, rate: 0.8 },
  },
  {
    id: "graph",
    name: "Mercer Graph",
    title: "CEO",
    company: "Omnifeed",
    archetype: "THE PLATFORM CEO",
    bio: "Has apologized to Congress four times using the same apology. Says “community” forty times per earnings call.",
    voice: { pitch: 0.9, rate: 1.0 },
  },
  {
    id: "accrual",
    name: "Preston Accrual",
    title: "CFO",
    company: "Monolith Holdings",
    archetype: "THE SHAREHOLDER WHISPERER",
    bio: "Can say “headcount optimization” without blinking. Has never been photographed outside a quarterly call.",
    voice: { pitch: 0.7, rate: 0.95 },
  },
];

export const OPERATOR_VOICE = { pitch: 1.1, rate: 1.0 };

export function speakerById(id: string): FictionalSpeaker {
  const found = FICTIONAL_SPEAKERS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown fictional speaker: ${id}`);
  return found;
}
