import { takeKey, type Take, type VoiceManifest } from "./take-math.ts";

// Pre-rendered voices (ElevenLabs), described by public/voices/manifest.json.
// Everything here is optional: with no manifest the app uses device speech.

let takes: Record<string, Take> = {};

export async function loadTakes(): Promise<number> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}voices/manifest.json`, { cache: "no-cache" });
    if (!r.ok) return 0;
    const manifest = (await r.json()) as VoiceManifest;
    takes = manifest.version === 1 ? manifest.takes : {};
  } catch {
    takes = {};
  }
  return Object.keys(takes).length;
}

export function findTake(voiceKey: string, text: string): Take | undefined {
  return takes[takeKey(voiceKey, text)];
}

export function takeCount(): number {
  return Object.keys(takes).length;
}
