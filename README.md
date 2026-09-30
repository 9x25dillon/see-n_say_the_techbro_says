# See ’n Say: Tech Bro Edition

A pull-string toy that plays tech-executive quotes with the context cut away. Pull the lever, the
pointer lands on a slice (AI, Layoffs, Mars, Shareholder Value…), a crackly robot narrator says
"The tech bro say…", and an anime-voiced executive says something that sounds terrible out of context.
Tap **Restore context** to hear what they actually meant. Sometimes it makes things worse.

The rule the whole app is built around: **the joke comes from where the knife lands, never from
invented words.** Real quotes are single contiguous cuts from real recordings, with the source one tap
away. Only the fictional executives can be spliced, and only in Mad Libs, with every seam shown.

## Run it

```sh
npm install
npm run dev            # http://localhost:5173 (toy), /ingest.html (clip ingest tool)
```

Other scripts:

| Script | What it does |
|---|---|
| `npm run validate` | Provenance gate: checks every clip; fails CI on any bad real clip or non-contiguous cut |
| `npm run typecheck` | TypeScript, no emit |
| `npm run build` | Production build of the toy and the ingest tool into `dist/` |
| `npm run build:single` | The toy as one self-contained HTML fragment in `dist-single/` |
| `npm run narrator` | Re-renders the fallback narrator voice with eSpeak (no account needed) |
| `npm run voices` | ElevenLabs voices: plan and cost by default, `--go` to render (see below) |

## Modes

| Mode | What happens |
|---|---|
| Classic | Pull → slice → a short excerpt → Context Integrity %. Then Source, Restore context, Make it worse (adds a clip from someone else, with a coincidence disclaimer). |
| Annihilator | Starts with the full quote and cuts it down step by step, striking out the removed text, until it means something awful. |
| Synergy | Three separate clips from three speakers, played as an accidental conversation. "These speakers were not talking to each other." |
| Mad Libs | Spliced sentences from fictional executives only, shown as a ransom note, each piece in a different voice. |
| Who Said It | Hear a line, pick the executive from four. Score and streak. |
| Restore | Hear the excerpt, guess what they were actually discussing, then hear the full context. |
| After Dark | Earnings-call lines only, with an operator. Real clips never get a made-up analyst question in front of them. |

Tap a wheel slice before pulling to aim at it. Space pulls the lever.

## Voices

Every line is performed by a **voice key**: `waifu:<persona>` (Waifu Dub on), `exec:<speaker>` (dub off),
`narrator`, `operator` or `analyst`. If `public/voices/manifest.json` has an ElevenLabs recording for that
voice and text, the app plays it. Anything missing falls back to the device's speech voices, so the toy
always works.

- **Waifu Dub** (on by default; switch in the footer). Each speaker has a fixed anime-trope persona
  (`src/catalog/waifus.ts`). Real clips keep their exact words: ElevenLabs' voice changer swaps the
  voice, or, before that's rendered, the clip is just sped and pitched up. The badge always says so.
- **Narrator**: says "The tech bro say…" before every pull, run through an ffmpeg chain that makes it
  sound like a worn pull-string toy (`scripts/toy-effect.ts`). Before ElevenLabs it uses an eSpeak
  rendering (`npm run narrator`; eSpeak-NG is GPL and only used as a dev tool).
- **Excerpts are cut from the full performance.** Each fictional line and receipt is recorded once, in
  full, with per-character timestamps. Every cut plays a time window of that recording, the same way
  real clips work, so an excerpt keeps the intonation of the sentence it was cut from.

### ElevenLabs setup

1. Put your key in `.env.local` (gitignored). The script reads it there and never prints it:
   `ELEVENLABS_API_KEY=...`
2. Pick voices. Either run `npm run voices -- --design`, which creates the eight personas and the
   narrator from the prompts in `voices.config.json` and saves their ids there (previews land in
   `.voice-previews/`), or run `npm run voices -- --list [search]` and paste ids into
   `voices.config.json` yourself. Designing uses 9 custom-voice slots; smaller plans have few.
3. Run `npm run voices` to see the plan and character count. Nothing is spent.
4. Run `npm run voices -- --go` to render. Re-runs only render what changed. `--only <group|voice>`
   and `--skip <group|voice>` narrow it. For example, `--skip exec:` leaves out the dub-off voices.

`npm run voices -- --account` shows your plan, credits left and custom-voice slots.

All 19 voices are designed and rendered: 141 files and 1,129 takes, which cost about 25,000 credits
including voice design and the speech-to-text checks. `npm run voices` should report nothing left to render. Speech-to-text
spot checks confirm that excerpts cut from the full recordings land on the right words; see
`GAP_SHARE` in `src/audio/take-math.ts` for why cut padding scales with the pause between words.

A full render is about 43,000 characters (about 30,000 with `--skip exec:`). Mad Libs is the largest
part, because every piece is recorded in every voice.

Voice rules: persona and executive voices are designed from descriptions. Don't clone or pick voices
that imitate a real person, including the executives being quoted and real voice actors.

## Receipts

Some real quotes only exist as text: tweets, leaked IMs, SEC filings, blog posts. These live in
`src/catalog/text-clips.json` and appear on the toy like any other clip, read aloud by the Waifu Dub
persona (or by the toy itself with the dub off), never in a voice meant to sound like the person.
**Source** and **Restore context** show the receipt: the whole original on thermal paper, the excerpt
highlighted, the percentage of context the toy dropped, and links to the original and an archived copy.
It never renders a cropped fragment on its own, so a screenshot can't pass for the real post.

The validator requires an https source, an archive snapshot (SEC EDGAR filings are exempt, since
they're permanent), a publication date, contiguous cuts, and a named reviewer. Receipts that pass
everything except review show up in `npm run dev`, stamped **Unreviewed**, and are left out of every
production build, along with their rendered audio (`scripts/vite-reviewed-only.ts`). To approve one, open its source and archive, check every character, then fill in
`review.by` and `review.at`.

Six receipts are live, reviewed by Randy on 2026-09-29. Their text was pulled from the sources below:

| Receipt | Source |
|---|---|
| Zuckerberg, 2004 IMs ("They "trust me"… Dumb fucks.") | Business Insider, May 13 2010 (confirmed by Zuckerberg to The New Yorker, Sept 2010) |
| Zuckerberg, "Move fast and break things" | Facebook S-1, Feb 1 2012, founder letter p. 69 (SEC EDGAR) |
| Tesla, "Technoking of Tesla and Master of Coin" | Tesla Form 8-K, Mar 15 2021 (SEC EDGAR) |
| Musk, "Potentially more dangerous than nukes." | Tweet, Aug 2 2014 (Wayback snapshot, Aug 5 2014) |
| Sutskever, "…slightly conscious" | Tweet, Feb 9 2022 (Wayback snapshot, Feb 13 2022) |
| Altman, "We are past the event horizon…" | "The Gentle Singularity", Jun 10 2025 (Wayback snapshot) |

## Content

- `src/catalog/fictional-clips.ts`: 55 lines from 8 invented executives (`speakers.ts`). Each line has
  a full context plus contiguous cuts, a real topic and three decoys for Restore mode.
- `src/catalog/real-clips.json`: **empty.** Real clips arrive through the ingest tool.
- `src/catalog/text-clips.json`: receipts (see above).
- `SOURCING.md`: the backlog of real quotes you pasted, triaged. Several can't be clips as written.

### Adding a real clip

1. Get the source audio and trim roughly to the moment (a few minutes), for example
   `ffmpeg -ss 12:00 -to 16:00 -i interview.mp4 -vn rough.m4a`.
2. Open `/ingest.html`, load `rough.m4a`, and enter where it starts in the original.
3. Drag on the top waveform to mark the 30–60 s context window. Drag on the zoomed waveform to mark
   the excerpt. Add Annihilator stages if you want them.
4. Type the exact transcript and excerpt words, source URL, title and date, topic, decoys, and your
   name as reviewer. The page validates as you type.
5. Run the ffmpeg command it gives you (it cuts `public/audio/<id>.m4a`), paste the JSON record into
   `real-clips.json`, and run `npm run validate`.

The validator rejects a real clip with a missing or non-https source, a future date, an excerpt under
0.3 s or over 15 s, windows that don't nest, text that isn't a contiguous piece of the transcript, a
missing audio file, or no reviewer. The app runs the same checks at load and silently drops failures.

## Layout

```
src/types.ts              data model (Clip = RealClip | FictionalClip)
src/catalog/              categories, speakers, waifus, fictional lines, Mad Libs banks, validator
src/engine/               clip views + context integrity, mode rules and picking (no DOM)
src/audio/                toy SFX, playback, pre-rendered takes (take-math.ts is shared with the renderer)
src/ui/                   wheel (SVG), lever, HTML builders
src/main.ts               the toy: modes and flows
src/ingest/               the ingest tool
scripts/                  validator, ElevenLabs + eSpeak renderers, toy effect, single-file build
voices.config.json        which ElevenLabs voice plays each voice key, plus design prompts
```

`src/engine` and `src/catalog` have no DOM dependencies, so they can move to a React Native or
Flutter (via JS) port as they are.

## Before shipping publicly

- "See ’n Say" is a Mattel trademark. It's fine for a parody web toy, but app stores will likely
  reject it in the listing name.
- Clips of interviews and broadcasts are someone else's copyrighted audio. Short, sourced cuts used
  for commentary and parody are the strongest fair-use position, and that's the shape this app
  enforces. Check your own situation, and the platform's terms before downloading anything.
