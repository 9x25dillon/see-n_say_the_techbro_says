import { audioContext, crackle, isMuted, output } from "./sfx.ts";

// Three ways to make a sound come out of the toy:
//   speak()      – speech synthesis, for fictional executives only
//   playWindow() – a time window of an authentic recording; the words are never
//                  edited, though Waifu Dub may play it faster and higher
//   narrate()    – the pre-rendered pull-string narrator

export interface SynthVoice {
  pitch: number;
  rate: number;
  /** Prefer the device's higher, feminine-named voices (Waifu Dub). */
  feminine?: boolean;
}

type Pending = () => void;
const pending = new Set<Pending>();
let source: AudioBufferSourceNode | null = null;
const buffers = new Map<string, Promise<AudioBuffer>>();

const synth: SpeechSynthesis | undefined = typeof speechSynthesis === "undefined" ? undefined : speechSynthesis;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

// Voice names vary by platform; these cover the usual macOS, Windows, Android and Chrome ones.
const FEMININE = /female|woman|girl|zira|aria|jenny|samantha|victoria|karen|moira|tessa|fiona|susan|hazel|serena|allison|ava|kathy|nicky|libby|sonia|emma|michelle|google uk english female|google us english/i;

function englishVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([]);
  voicesReady ??= new Promise((resolve) => {
    const collect = () => synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
    if (collect().length) return resolve(collect());
    const done = () => resolve(collect());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
  return voicesReady;
}

/** True when the browser can actually talk. Resolves after voices load. */
export async function canSpeak(): Promise<boolean> {
  return (await englishVoices()).length > 0;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Rough reading time, used when there is no voice and as a watchdog. */
export function estimateMs(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).length;
  return Math.round((words / (2.7 * rate)) * 1000) + 350;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      pending.delete(finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    pending.add(finish);
  });
}

/**
 * Speaks a line. Each speaker key gets a stable voice from whatever English
 * voices the device has, plus its own pitch and rate. Without speech synthesis
 * the line is shown for its reading time instead.
 */
export async function speak(text: string, voice: SynthVoice, speakerKey: string): Promise<void> {
  const stopCrackle = crackle();
  try {
    const voices = await englishVoices();
    // Speech synthesis bypasses the Web Audio graph, so mute has to skip it here.
    if (!synth || !voices.length || isMuted()) {
      await wait(estimateMs(text, voice.rate));
      return;
    }
    const feminine = voice.feminine ? voices.filter((v) => FEMININE.test(v.name)) : [];
    const pool = feminine.length ? feminine : voices;
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = pool[hash(speakerKey) % pool.length];
      u.pitch = voice.pitch;
      u.rate = voice.rate;
      let timer = 0;
      const finish = () => {
        clearTimeout(timer);
        pending.delete(finish);
        resolve();
      };
      // Some engines never fire onend; don't let the toy hang.
      timer = window.setTimeout(finish, estimateMs(text, voice.rate) * 2 + 2500);
      u.onend = finish;
      u.onerror = finish;
      pending.add(finish);
      synth.speak(u);
    });
  } finally {
    stopCrackle();
  }
}

function loadBuffer(url: string): Promise<AudioBuffer> {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
        return r.arrayBuffer();
      })
      .then((data) => audioContext().decodeAudioData(data));
    buffers.set(url, p);
    p.catch(() => buffers.delete(url));
  }
  return p;
}

/** URL for a file under public/ (clips, pre-rendered voices). */
export const publicUrl = (file: string) => `${import.meta.env.BASE_URL}${file}`;

/** Warm the cache so the first pull doesn't wait on the network. */
export function preload(file: string) {
  void loadBuffer(publicUrl(file)).catch(() => {});
}

function playBuffer(buffer: AudioBuffer, startMs: number, endMs: number | undefined, rate: number): Promise<void> {
  const ac = audioContext();
  return new Promise<void>((resolve) => {
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const offset = startMs / 1000;
    const duration = endMs === undefined ? buffer.duration - offset : (endMs - startMs) / 1000;
    // A short fade at each edge, so a cut never clicks.
    const fade = ac.createGain();
    const t0 = ac.currentTime;
    const t1 = t0 + Math.max(0.05, duration) / rate;
    fade.gain.setValueAtTime(0, t0);
    fade.gain.linearRampToValueAtTime(1, t0 + 0.012);
    fade.gain.setValueAtTime(1, Math.max(t0 + 0.012, t1 - 0.015));
    fade.gain.linearRampToValueAtTime(0, t1);
    src.connect(fade).connect(output());
    const finish = () => {
      pending.delete(finish);
      if (source === src) source = null;
      resolve();
    };
    src.onended = finish;
    pending.add(finish);
    source = src;
    // start()'s duration is in buffer time, so the window stays exact at any rate.
    src.start(t0, offset, Math.max(0.05, duration));
  });
}

/** Plays [startMs, endMs) of an authentic recording, or the whole file. */
export async function playWindow(file: string, startMs = 0, endMs?: number, rate = 1): Promise<void> {
  const buffer = await loadBuffer(publicUrl(file));
  await playBuffer(buffer, startMs, endMs, rate);
}

/**
 * The narrator. Like a real pull-string toy, the record speed drifts a little
 * with every pull. Falls back to a flat robot synth voice if the file fails.
 */
export async function narrate(url: string, fallbackText: string): Promise<void> {
  if (isMuted()) return;
  const stopCrackle = crackle();
  try {
    const buffer = await loadBuffer(url);
    await playBuffer(buffer, 0, undefined, 0.93 + Math.random() * 0.14);
  } catch {
    stopCrackle();
    await speak(fallbackText, { pitch: 0.3, rate: 0.75 }, "narrator");
  } finally {
    stopCrackle();
  }
}

/** Silences everything and releases anyone awaiting speak()/playWindow()/narrate(). */
export function stopVoice() {
  synth?.cancel();
  try {
    source?.stop();
  } catch {
    /* already stopped */
  }
  source = null;
  for (const finish of [...pending]) finish();
}
