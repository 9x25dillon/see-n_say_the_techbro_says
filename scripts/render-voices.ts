// ElevenLabs voice renderer.
//
//   npm run voices                    plan + character count; spends nothing
//   npm run voices -- --list [text]   voices on your account (free)
//   npm run voices -- --account       plan, credits left, custom-voice slots (free)
//   npm run voices -- --design        create persona voices from their prompts
//   npm run voices -- --go            render everything not already rendered
//   add --only <prefix> to limit to a group or voice ("madlibs", "waifu:genki")
//   add --skip <prefix> to leave one out ("exec:" skips the dub-off voices)
//   add --force to re-render even when nothing changed
//
// Reads ELEVENLABS_API_KEY from .env.local and never prints it. Writes audio
// to public/voices/ and public/voices/manifest.json, which the app loads.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { RealClip, TextClip } from "../src/types.ts";
import { FICTIONAL_CLIPS } from "../src/catalog/fictional-clips.ts";
import { WAIFUS, waifuFor } from "../src/catalog/waifus.ts";
import { FICTIONAL_SPEAKERS } from "../src/catalog/speakers.ts";
import { ANALYSTS, ANALYST_QUESTIONS } from "../src/catalog/earnings.ts";
import { NARRATOR_SPEECH, operatorExcerpt, operatorIntro } from "../src/catalog/narration.ts";
import {
  MADLIB_CONNECTORS,
  MADLIB_OBJECTS,
  MADLIB_OPENERS,
  MADLIB_OUTCOMES,
  MADLIB_VERBS,
} from "../src/catalog/madlibs.ts";
import { takeKey, textHash, windowOf, type Take, type VoiceManifest } from "../src/audio/take-math.ts";
import { toyChain } from "./toy-effect.ts";

// ── Setup ─────────────────────────────────────────────────────────────
const root = join(import.meta.dirname, "..");
const API = "https://api.elevenlabs.io";
const args = process.argv.slice(2);
const has = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined;
};

interface Settings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  speed: number;
}
interface VoiceSpec {
  voiceId: string;
  name: string;
  design?: string;
  settings?: Partial<Settings>;
  toyEffect?: boolean;
}
interface Config {
  model: string;
  outputFormat: string;
  stsModel: string;
  defaults: Settings;
  voices: Record<string, VoiceSpec>;
}

const configPath = join(root, "voices.config.json");
const config = JSON.parse(readFileSync(configPath, "utf8")) as Config;
const publicDir = join(root, "public");
const manifestPath = join(publicDir, "voices", "manifest.json");
const manifest: VoiceManifest & { takes: Record<string, Take & { sig?: string }> } = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { version: 1, takes: {} };

const readJson = <T>(path: string): T => JSON.parse(readFileSync(join(root, path), "utf8")) as T;
const realClips = readJson<RealClip[]>("src/catalog/real-clips.json");
const textClips = readJson<TextClip[]>("src/catalog/text-clips.json");

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) {
    console.error("ELEVENLABS_API_KEY is not set. Add it to .env.local:  ELEVENLABS_API_KEY=your_key");
    process.exit(1);
  }
  return key;
}

async function api(path: string, init: RequestInit & { json?: unknown } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("xi-api-key", apiKey());
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}${path}`, { ...init, headers, body, signal: AbortSignal.timeout(180_000) });
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= 4) {
      const detail = (await res.text()).slice(0, 400);
      throw new Error(`ElevenLabs ${res.status} on ${path.split("?")[0]}: ${detail}`);
    }
    const wait = 2000 * attempt;
    console.warn(`  ${res.status}, retrying in ${wait / 1000}s…`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const settingsFor = (spec: VoiceSpec): Settings => ({ ...config.defaults, ...spec.settings });

function durationMs(file: string): number {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString();
  return Math.round(Number(out) * 1000);
}

// ── Jobs ──────────────────────────────────────────────────────────────
type Job =
  | { kind: "aligned"; group: string; voiceKey: string; text: string; file: string; pad?: boolean }
  | { kind: "batch"; group: string; voiceKey: string; lines: string[]; file: string }
  | { kind: "sts"; group: string; voiceKey: string; audioFile: string; file: string };

const waifuKey = (speakerKey: string) => `waifu:${waifuFor(speakerKey).id}`;
const realKey = (speaker: string) => `real:${speaker.toLowerCase()}`;

function planJobs(filtered = true): Job[] {
  const jobs: Job[] = [];
  for (const clip of FICTIONAL_CLIPS) {
    for (const voiceKey of [waifuKey(`fictional:${clip.speakerId}`), `exec:${clip.speakerId}`]) {
      jobs.push({ kind: "aligned", group: "clips", voiceKey, text: clip.fullContext, file: `voices/clip.${clip.id}.${slug(voiceKey)}.mp3` });
    }
  }
  for (const clip of textClips) {
    for (const voiceKey of [waifuKey(realKey(clip.speaker)), "narrator"]) {
      jobs.push({ kind: "aligned", group: "receipts", voiceKey, text: clip.contextText, file: `voices/receipt.${clip.id}.${slug(voiceKey)}.mp3` });
    }
  }
  const pieces = [
    ...MADLIB_OPENERS,
    ...MADLIB_VERBS.flatMap((v) => (v.post ? [v.pre, v.post] : [v.pre])),
    ...MADLIB_OBJECTS,
    ...MADLIB_CONNECTORS,
    ...MADLIB_OUTCOMES,
  ];
  const madlibVoices = [...WAIFUS.map((w) => `waifu:${w.id}`), ...FICTIONAL_SPEAKERS.map((s) => `exec:${s.id}`)];
  for (const voiceKey of madlibVoices) {
    jobs.push({ kind: "batch", group: "madlibs", voiceKey, lines: [...new Set(pieces)], file: `voices/madlibs.${slug(voiceKey)}.mp3` });
  }
  const earnings = [...realClips, ...textClips].filter((c) => c.tags?.includes("earnings-call"));
  jobs.push({
    kind: "batch",
    group: "calls",
    voiceKey: "operator",
    lines: [...ANALYSTS.map(operatorIntro), ...earnings.map((c) => operatorExcerpt(c.sourceTitle))],
    file: "voices/calls.operator.mp3",
  });
  jobs.push({ kind: "batch", group: "calls", voiceKey: "analyst", lines: ANALYST_QUESTIONS, file: "voices/calls.analyst.mp3" });
  jobs.push({ kind: "aligned", group: "narrator", voiceKey: "narrator", text: NARRATOR_SPEECH, file: "voices/narrator.tech-bro-say.mp3", pad: true });
  for (const clip of realClips) {
    const voiceKey = waifuKey(realKey(clip.speaker));
    jobs.push({ kind: "sts", group: "real", voiceKey, audioFile: clip.audioFile, file: `voices/sts.${clip.id}.${slug(voiceKey)}.mp3` });
  }
  if (!filtered) return jobs;
  const only = option("only");
  const skip = option("skip");
  const match = (j: Job, p: string) => j.group === p || j.voiceKey.startsWith(p);
  return jobs.filter((j) => (!only || match(j, only)) && (!skip || !match(j, skip)));
}

// Batched lines get terminal punctuation so each is read as its own utterance.
function batchText(lines: string[]): { text: string; ranges: [number, number][] } {
  let text = "";
  const ranges: [number, number][] = [];
  for (const line of lines) {
    if (text) text += "\n\n";
    ranges.push([text.length, text.length + line.length]);
    text += /[.!?…,:;]$/.test(line) ? line : `${line}.`;
  }
  return { text, ranges };
}

function jobChars(job: Job): number {
  if (job.kind === "aligned") return job.text.length;
  if (job.kind === "batch") return batchText(job.lines).text.length;
  return 0;
}

function signature(job: Job): string {
  const spec = config.voices[job.voiceKey];
  const payload = job.kind === "aligned" ? job.text : job.kind === "batch" ? job.lines : job.audioFile;
  const model = job.kind === "sts" ? config.stsModel : config.model;
  return textHash(JSON.stringify([spec?.voiceId, model, config.outputFormat, spec && settingsFor(spec), spec?.toyEffect, job.kind === "aligned" && job.pad, payload]));
}

function keysFor(job: Job): string[] {
  if (job.kind === "aligned") return [takeKey(job.voiceKey, job.text)];
  if (job.kind === "batch") return job.lines.map((l) => takeKey(job.voiceKey, l));
  return [takeKey(job.voiceKey, `sts:${job.audioFile}`)];
}

function isDone(job: Job): boolean {
  const sig = signature(job);
  return existsSync(join(publicDir, job.file)) && keysFor(job).every((k) => manifest.takes[k]?.sig === sig);
}

// ── ElevenLabs calls ──────────────────────────────────────────────────
/** Maps API alignment characters back onto our text, tolerating small differences. */
function charTimes(text: string, chars: string[], starts: number[], ends: number[]) {
  const cs = new Array<number>(text.length).fill(-1);
  const ce = new Array<number>(text.length).fill(-1);
  let j = 0;
  for (let i = 0; i < text.length && j < chars.length; i++) {
    if (text[i] === chars[j]) {
      cs[i] = starts[j] * 1000;
      ce[i] = ends[j] * 1000;
      j++;
      continue;
    }
    const ahead = chars.slice(j, j + 8).indexOf(text[i]);
    if (ahead > 0) {
      j += ahead;
      cs[i] = starts[j] * 1000;
      ce[i] = ends[j] * 1000;
      j++;
    }
  }
  // Fill unmatched characters from their neighbours.
  for (let i = 0; i < text.length; i++) if (cs[i] < 0) cs[i] = i ? ce[i - 1] : 0;
  for (let i = text.length - 1; i >= 0; i--) if (ce[i] < 0) ce[i] = i < text.length - 1 ? cs[i + 1] : cs[i];
  return { cs: cs.map(Math.round), ce: ce.map(Math.round) };
}

async function tts(voiceKey: string, text: string) {
  const spec = config.voices[voiceKey];
  const res = await api(`/v1/text-to-speech/${spec.voiceId}/with-timestamps?output_format=${config.outputFormat}`, {
    method: "POST",
    json: { text, model_id: config.model, voice_settings: settingsFor(spec) },
  });
  const data = (await res.json()) as {
    audio_base64: string;
    alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
  };
  const a = data.alignment;
  const times = a
    ? charTimes(text, a.characters, a.character_start_times_seconds, a.character_end_times_seconds)
    : undefined;
  return { audio: Buffer.from(data.audio_base64, "base64"), times };
}

function writeAudio(job: Job, audio: Buffer, pad = false): string {
  const out = join(publicDir, job.file);
  mkdirSync(join(publicDir, "voices"), { recursive: true });
  if (config.voices[job.voiceKey]?.toyEffect) {
    const raw = join(tmpdir(), `seensay-${process.pid}-${Date.now()}.mp3`);
    writeFileSync(raw, audio);
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", raw, "-af", toyChain({ pad }), "-ac", "1", "-ar", "44100", "-b:a", "96k", out]);
    rmSync(raw, { force: true });
  } else {
    writeFileSync(out, audio);
  }
  return out;
}

async function runJob(job: Job) {
  const sig = signature(job);
  if (job.kind === "aligned") {
    const { audio, times } = await tts(job.voiceKey, job.text);
    const out = writeAudio(job, audio, job.pad);
    const end = durationMs(out);
    // The padded narrator line shifts by the lead-in; it's played whole, so timings aren't needed.
    const timed = times && !job.pad ? { cs: times.cs, ce: times.ce } : {};
    manifest.takes[takeKey(job.voiceKey, job.text)] = { file: job.file, start: 0, end, ...timed, sig };
  } else if (job.kind === "batch") {
    const { text, ranges } = batchText(job.lines);
    const { audio, times } = await tts(job.voiceKey, text);
    const out = writeAudio(job, audio);
    const end = durationMs(out);
    const whole: Take = { file: job.file, start: 0, end, ...(times ?? {}) };
    job.lines.forEach((line, i) => {
      const [from, to] = ranges[i];
      const w = windowOf(whole, text, from, to);
      manifest.takes[takeKey(job.voiceKey, line)] = { file: job.file, start: w.startMs, end: w.endMs, sig };
    });
  } else {
    const spec = config.voices[job.voiceKey];
    const source = join(publicDir, job.audioFile);
    const form = new FormData();
    form.append("audio", new Blob([readFileSync(source)]), basename(source));
    form.append("model_id", config.stsModel);
    form.append("voice_settings", JSON.stringify(settingsFor(spec)));
    form.append("remove_background_noise", "false");
    const res = await api(`/v1/speech-to-speech/${spec.voiceId}?output_format=${config.outputFormat}`, { method: "POST", body: form });
    const out = writeAudio(job, Buffer.from(await res.arrayBuffer()));
    const end = durationMs(out);
    const original = durationMs(source);
    if (Math.abs(end - original) / original > 0.03) {
      console.warn(`  ! ${job.file} is ${end} ms vs ${original} ms original; excerpt windows may drift`);
    }
    manifest.takes[takeKey(job.voiceKey, `sts:${job.audioFile}`)] = { file: job.file, start: 0, end, sig };
  }
  writeFileSync(manifestPath, JSON.stringify(manifest) + "\n");
}

// ── Commands ──────────────────────────────────────────────────────────
async function listVoices() {
  const search = option("list");
  let token: string | null = null;
  const rows: string[] = [];
  do {
    const q = new URLSearchParams({ page_size: "100", ...(search ? { search } : {}), ...(token ? { next_page_token: token } : {}) });
    const res = await api(`/v2/voices?${q}`);
    const data = (await res.json()) as {
      voices: { voice_id: string; name: string; category: string; labels?: Record<string, string> }[];
      has_more: boolean;
      next_page_token: string | null;
    };
    for (const v of data.voices) {
      const labels = Object.values(v.labels ?? {}).filter(Boolean).join(", ");
      rows.push(`${v.voice_id}  ${v.name.padEnd(28).slice(0, 28)}  ${v.category.padEnd(12)}  ${labels}`);
    }
    token = data.has_more ? data.next_page_token : null;
  } while (token);
  console.log(rows.length ? rows.join("\n") : "No voices found.");
  console.log(`\nPut a voice_id into voices.config.json under the voice you want it to play.`);
}

async function account() {
  const res = await api("/v1/user/subscription");
  const s = (await res.json()) as Record<string, unknown>;
  const n = (k: string) => (typeof s[k] === "number" ? (s[k] as number) : undefined);
  const used = n("character_count");
  const limit = n("character_limit");
  const reset = n("next_character_count_reset_unix");
  console.log(`Plan:          ${s.tier ?? "?"} (${s.status ?? "?"})`);
  if (used !== undefined && limit !== undefined) {
    console.log(`Credits:       ${used.toLocaleString()} used of ${limit.toLocaleString()} (${(limit - used).toLocaleString()} left)`);
  }
  if (reset) console.log(`Resets:        ${new Date(reset * 1000).toISOString().slice(0, 10)}`);
  const slotsUsed = n("voice_slots_used");
  const slotLimit = n("voice_limit");
  if (slotLimit !== undefined) console.log(`Custom voices: ${slotsUsed ?? "?"} used of ${slotLimit}`);
  return { used, limit, slotsUsed, slotLimit };
}

async function designVoices() {
  // By default only the eight personas and the narrator: custom-voice slots are limited on smaller plans.
  const only = option("only");
  const keys = Object.keys(config.voices).filter((k) =>
    only ? k.startsWith(only) : k.startsWith("waifu:") || k === "narrator",
  );
  const previewDir = join(root, ".voice-previews");
  mkdirSync(previewDir, { recursive: true });
  for (const key of keys) {
    const spec = config.voices[key];
    if (spec.voiceId || !spec.design) continue;
    console.log(`Designing ${key} (${spec.name})…`);
    const res = await api("/v1/text-to-voice/design", {
      method: "POST",
      json: { voice_description: spec.design, auto_generate_text: true, model_id: "eleven_multilingual_ttv_v2" },
    });
    const { previews } = (await res.json()) as { previews: { generated_voice_id: string; audio_base_64: string }[] };
    previews.forEach((p, i) => writeFileSync(join(previewDir, `${slug(key)}-${i + 1}.mp3`), Buffer.from(p.audio_base_64, "base64")));
    const created = await api("/v1/text-to-voice", {
      method: "POST",
      json: { voice_name: `See n Say: ${spec.name}`, voice_description: spec.design, generated_voice_id: previews[0].generated_voice_id },
    });
    spec.voiceId = ((await created.json()) as { voice_id: string }).voice_id;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    console.log(`  saved as ${spec.voiceId} (previews in .voice-previews/)`);
  }
}

/** Drop manifest entries that no job produces any more (edited or removed text). */
function pruneManifest(): number {
  const live = new Set(planJobs(false).flatMap(keysFor));
  let removed = 0;
  for (const key of Object.keys(manifest.takes)) {
    if (!live.has(key)) {
      delete manifest.takes[key];
      removed++;
    }
  }
  if (removed) writeFileSync(manifestPath, JSON.stringify(manifest) + "\n");
  return removed;
}

async function render(jobs: Job[]) {
  let done = 0;
  for (const job of jobs) {
    const label = `${job.group} · ${job.voiceKey} · ${job.file}`;
    try {
      await runJob(job);
      console.log(`✓ ${label}`);
      done++;
    } catch (err) {
      console.error(`✗ ${label}\n  ${(err as Error).message}`);
      if (/\b(401|402|403)\b/.test((err as Error).message)) {
        console.error("Stopping: the API key was refused or the account is out of credits.");
        break;
      }
    }
  }
  const pruned = pruneManifest();
  console.log(`\nRendered ${done}/${jobs.length}.${pruned ? ` Removed ${pruned} stale take(s).` : ""} Manifest: public/voices/manifest.json`);
}

async function main() {
  if (has("list")) return listVoices();
  if (has("account")) return void (await account());
  if (has("design")) return designVoices();

  const all = planJobs();
  const missing = [...new Set(all.map((j) => j.voiceKey))].filter((k) => !config.voices[k]?.voiceId).sort();
  const ready = all.filter((j) => config.voices[j.voiceKey]?.voiceId);
  const todo = ready.filter((j) => has("force") || !isDone(j));

  const byGroup = new Map<string, { jobs: number; chars: number }>();
  for (const j of todo) {
    const g = byGroup.get(j.group) ?? { jobs: 0, chars: 0 };
    g.jobs++;
    g.chars += jobChars(j);
    byGroup.set(j.group, g);
  }
  const total = todo.reduce((n, j) => n + jobChars(j), 0);
  console.log(`Model ${config.model}, ${config.outputFormat}\n`);
  for (const [group, g] of byGroup) console.log(`  ${group.padEnd(10)} ${String(g.jobs).padStart(4)} requests  ${String(g.chars).padStart(7)} characters`);
  console.log(`\n  To render: ${todo.length} requests, ${total.toLocaleString()} characters of text-to-speech.`);
  console.log(`  Already rendered and unchanged: ${ready.length - todo.length}.`);
  if (todo.some((j) => j.kind === "sts")) console.log(`  Plus ${todo.filter((j) => j.kind === "sts").length} voice-changer request(s), billed by audio length.`);
  if (missing.length) {
    console.log(`\n  No voiceId yet (skipped; the app uses device speech for these):\n    ${missing.join("\n    ")}`);
    console.log(`  Fill them in voices.config.json, or run --design to create them from their prompts.`);
  }
  if (!has("go")) {
    console.log(`\nDry run. Add --go to render. Credits per character depend on the model and your plan.`);
    return;
  }
  await render(todo);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
