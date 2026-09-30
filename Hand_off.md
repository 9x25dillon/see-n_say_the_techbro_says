# Hand-off — See ’n Say: Tech Bro Edition (`~/see-n_say_the_techbro_says`)

## Resume here
**Newest close:** 29 September 2026, 22:10 PDT · Claude Code / Claude Opus 5.5 · session `13eb489f`
**Where things stand:** The toy is playable and public: seven modes, 55 fictional lines, 6 reviewed
receipts, and 19 ElevenLabs voices (141 rendered files, verified by speech-to-text spot checks).
Everything is committed and pushed (`b533dec`), and the private artifact is on v5. Nothing is half-done.
The two known soft spots are that Mad Libs pieces still use the old cut padding, and that there are no
automated tests (today's checks lived in a temp folder).
**Decision needed:** none.
**Start with:**
1. `npm install && npm run validate && npm run typecheck`: catalog and types are green.
2. `npm run voices`: should say "To render: 0 requests" (all audio present; the key comes from `.env.local`).
3. Open https://claude.ai/artifact/NHRWbVHeJ4Zc99UEiC5Fnk and pull the lever: the one thing not yet
   verified is audio playback inside the claude.ai viewer (only tested locally).

## Progress track (newest first)
| Date | Session | Shipped (hash / PR) | State after |
|---|---|---|---|
| 2026-09-29 | Opus 5.5 `13eb489f` | see-n-say `b533dec`: 6 receipts signed (review by Randy) | Receipts + their audio ship in production; artifact v5 |
| 2026-09-29 | Opus 5.5 `13eb489f` | The_St `06be835`, VIbe_coder_9xk1ll `dfb4abb`: ignore `.env*` (public repos) | Both on `main`, pushed; The_St push also published the user's earlier `0bdd77c` |
| 2026-09-29 | Opus 5.5 `13eb489f` | see-n-say `8ff1d3c`: first playable version, 141 voice files | Public repo github.com/9x25dillon/see-n_say_the_techbro_says; artifact v4 |

## Decisions (why things are the way they are)
- 2026-09-29 **Real people only through their own words.** Real audio = one contiguous cut with source,
  timestamps, exact transcript and a reviewer; text-only quotes = receipts. Fictional executives carry
  all invented lines. Rejected: naming voices after real CEOs (user asked), because the voices perform
  fabricated lines, so that would publish fake quotes attributed to real people.
- 2026-09-29 **Pasted CEO quote lists went to `SOURCING.md`, not the catalog.** They mixed verbatim,
  paraphrased and unmatchable lines. Six were verified from primary sources and became receipts.
- 2026-09-29 **Receipts show the whole original** on thermal paper with the excerpt highlighted, never a
  cropped fragment, so a screenshot can't pass as the real post. Unreviewed receipts are stripped from
  production builds, text and audio (`scripts/vite-reviewed-only.ts`).
- 2026-09-29 **Waifu Dub never changes real words.** Real clips: ElevenLabs speech-to-speech or a
  pitch-up, labelled "voice altered". Fictional lines and receipts: persona voices.
- 2026-09-29 **Excerpts are cut from one full performance** using ElevenLabs per-character timestamps
  (`src/audio/take-math.ts`), so a cut keeps the sentence's intonation. Padding is 30% of the pause
  between words (`GAP_SHARE`, line 37) after STT caught "who were about to fire…" bleeding in.
- 2026-09-29 **Web first (Vite + TS), not React Native/Flutter.** `src/engine` and `src/catalog` have no
  DOM, so they port as-is.
- 2026-09-29 **Rendered audio is committed to git** (50 MB) so credits are never re-spent. Each re-render
  adds history; consider Git LFS if it grows.
- 2026-09-29 **One local key store:** `~/.config/secrets/elevenlabs.env` (600), loaded by a marked block
  at the end of `~/.bashrc`, and imported by Alacritty via `~/.config/secrets/alacritty-env.toml`.
  Fish and zsh configs deliberately untouched (user's choice: don't edit fish while working in it).

## Dead ends (don't retry without new information)
- X/Twitter oEmbed (`publish.twitter.com/oembed`) returns non-JSON to scripts. Use Wayback snapshots
  (`https://web.archive.org/web/<YYYYMMDD>/<tweet-url>`; the tweet text is in `TweetTextSize` / og tags).
- Wayback availability API (`archive.org/wayback/available`) rate-limits after a few calls; fetch
  `web.archive.org/web/<ts>/<url>` directly instead.
- eSpeak-NG WASM `robosoft` variants need Klatt, which that build strips; it falls back to the default voice.
- `pkill -f "<pattern>"` in the same command that started the server kills the tool shell (exit 144).
  Stop servers in a separate command.
- Writing shell startup files without an explicit user OK is blocked by Claude Code auto mode
  ("Unauthorized Persistence"). Ask first; the user then approved bash + Alacritty only.

## Open questions (settle these first)
- Does audio play inside the claude.ai artifact viewer? Pull the lever on the link above, desktop and phone.
- Mad Libs pieces were windowed at render time with the old fixed padding (`scripts/render-voices.ts:282`);
  batch takes store no per-character timings, so the `GAP_SHARE` fix doesn't reach them. One STT check
  ("the Pope") was clean. Settle: STT-sweep a sample, or store timings for batch lines and re-render.
- Credits billed ~9,200 for 20,863 characters, below the 1-credit-per-character estimate. Check the
  ElevenLabs usage page before budgeting the next render.
- "See ’n Say" is a Mattel trademark: fine for a parody web toy; rename before any app-store listing.

## State (verified 22:08–22:10 PDT)
- **see-n_say_the_techbro_says** `main`: 0 behind / 0 ahead of origin, last `b533dec`, public, no CI.
- **The_St** `main`: in sync, last `06be835`. **VIbe_coder_9xk1ll** `main`: in sync, last `dfb4abb`.
- **Artifact** https://claude.ai/artifact/NHRWbVHeJ4Zc99UEiC5Fnk v5 (private; share from its menu).
- **ElevenLabs** (Creator): 24,960 of 188,206 credits used, resets 2026-10-27; 22 of 30 voice slots.
  Voice ids are in `voices.config.json`; the persona previews are in `.voice-previews/` (gitignored).

## Project health
- Checks: PASS 2 (typecheck, build) · FAIL 0 · SKIP 0, from `checks.sh --run --include-slow` at 22:09.
  `npm run validate`: 55 fictional lines, 6 receipts accepted. No unit tests, no CI workflow.
- Fragile spots: device speech voices on Linux (fallback only now); `public/voices` size in git history.

## Next steps, in order
1. Pull the lever on the artifact link (desktop + phone) to confirm audio in the viewer.
2. Add `npm test` (Node's built-in `node --test`): the window-math cases (`"your kids"` must stop before
   the apostrophe; mismatched timings fall back to the whole take) and validator cases (non-contiguous
   cut rejected, unreviewed receipt → awaiting review). Smallest useful test for today's work.
3. Store per-character timings for batch lines in `runJob` (batch branch, `scripts/render-voices.ts`)
   and re-render Mad Libs with `npm run voices -- --only madlibs --force --go` (dry-run first; ~24k chars).
4. More receipts from `SOURCING.md` (Pichai "more profound than… fire", Cook MIT 2017, Hassabis,
   Nadella): fetch the primary source, copy verbatim, archive link, leave `review` empty for the user.
5. Real audio clips via `npm run dev` → `/ingest.html` (Musk MIT 2014 "summoning the demon" is the best first one).
6. Machine: add fish/zsh key loaders when the user isn't working in fish; remove the two stray
   `vm.*` sysctl lines at the end of `~/.bashrc` (user deferred both).

## One-shot check
    bash ~/.claude/skills/hanoffed/scripts/scan.sh --root ~/see-n_say_the_techbro_says --fetch
    bash ~/.claude/skills/hanoffed/scripts/checks.sh ~/see-n_say_the_techbro_says --run
    cd ~/see-n_say_the_techbro_says && npm run validate && npm run voices

## Rules that still apply
- Never invent words for a real person. Cuts are contiguous; every real quote carries its source.
- Receipts and real clips ship only after a human fills `review.by` / `review.at` (the user signs as "Randy").
- Never print or commit the ElevenLabs key. It lives in `~/.config/secrets/`; to rotate, edit both
  `elevenlabs.env` and `alacritty-env.toml`. The project `.env.local` is a symlink to the first.
- Voice renders: run the dry run, state the credit cost, and stay inside the budget the user named.
- Voice Design prompts describe adults and never imitate a real person or a specific character/actor.
- Existing repos: commit on a branch, then merge when the user says so; say plainly when a push is public.
- Don't edit the fish config while the user is working in fish.

## Vocabulary so far
referent, idempotent (Sonnet 5.5) · provenance, invariant (Codex) · presupposition, stipulate,
contiguous, fast-forward (Opus 5.5) — all 2026-09-29; glosses in `~/.claude/skills/hanoffed/vocabulary.md`.

## Opening prompt for next session (edit the brackets)
> Read `~/see-n_say_the_techbro_says/Hand_off.md` and run its one-shot check. Then [add `npm test` for
> the window math and validator | verify the Pichai, Cook and Hassabis quotes and add the verbatim
> ones as receipts awaiting my review]. ElevenLabs budget: [N] credits, dry run first. Stipulate: live
> work, commit to main, push when I say. When we wrap up: /hanoffed see-n-say.
