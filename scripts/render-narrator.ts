// Renders the narrator's lines: eSpeak-NG's robot voice, then ffmpeg turns it
// into a worn-out pull-string toy (record wow, ring-mod buzz, bit-crush, a
// tiny plastic speaker). Run with: npm run narrator
//
// eSpeak-NG is GPL and is only used here as a dev tool; the app ships the
// rendered MP3, never the synthesizer.

import ESpeakNg from "espeak-ng";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toyChain } from "./toy-effect.ts";

const LINES: Record<string, string> = {
  "tech-bro-say": "The tech bro say",
};

const TOY_CHAIN = toyChain({ pad: true });

const work = mkdtempSync(join(tmpdir(), "narrator-"));
try {
  for (const [id, text] of Object.entries(LINES)) {
    const espeak = await ESpeakNg({ arguments: ["-v", "en-us+robosoft", "-s", "104", "-p", "38", "-w", "/out.wav", text] });
    const raw = join(work, `${id}.wav`);
    writeFileSync(raw, espeak.FS.readFile("/out.wav"));
    const out = join(import.meta.dirname, "..", "src", "assets", `narrator-${id}.mp3`);
    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", raw, "-af", TOY_CHAIN, "-ac", "1", "-ar", "44100", "-b:a", "64k", out]);
    console.log(`rendered ${out}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
