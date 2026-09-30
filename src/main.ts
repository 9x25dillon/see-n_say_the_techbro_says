import "./styles.css";
import type { CategoryId } from "./types.ts";
import { loadCatalog } from "./catalog/index.ts";
import { categoryById, CATEGORY_IDS } from "./catalog/categories.ts";
import { FICTIONAL_SPEAKERS, OPERATOR_VOICE, speakerById } from "./catalog/speakers.ts";
import { ANALYSTS, ANALYST_QUESTIONS } from "./catalog/earnings.ts";
import { waifuFor } from "./catalog/waifus.ts";
import { contextIntegrity, viewOf, type ClipView, type Step } from "./engine/clip-view.ts";
import { buildMadLib, Deck, MODES, topicChoices, type ModeId } from "./engine/modes.ts";
import { pick } from "./engine/rng.ts";
import { createWheel } from "./ui/wheel.ts";
import { createLever } from "./ui/lever.ts";
import * as sfx from "./audio/sfx.ts";
import { canSpeak, estimateMs, narrate, playWindow, preload, publicUrl, speak, stopVoice, type SynthVoice } from "./audio/voice.ts";
import { findTake, loadTakes } from "./audio/takes.ts";
import { windowOf } from "./audio/take-math.ts";
import { NARRATOR_LINE, NARRATOR_SPEECH, operatorExcerpt, operatorIntro } from "./catalog/narration.ts";
import narratorUrl from "./assets/narrator-tech-bro-say.mp3";
import { cutHtml, disclaimerHtml, esc, kindBadge, meterHtml, quoteHtml, receiptHtml, revealWords, sourceHtml } from "./ui/render.ts";

// ── Catalog ───────────────────────────────────────────────────────────
const catalog = loadCatalog();
const deck = new Deck(catalog.clips.map(viewOf));

// ── DOM ───────────────────────────────────────────────────────────────
const $ = (id: string) => document.getElementById(id)!;
const modeNav = $("modes");
const knMode = $("kn-mode");
const body = $("kn-body");
const actionsEl = $("kn-actions");
const after = () => document.getElementById("kn-after");

const wheel = createWheel(aim);
$("dial").append(wheel.svg);
void document.fonts?.ready.then(() => wheel.fitLabels());
const lever = createLever(() => void pull());
$("lever-mount").append(lever.root);

// ── State ─────────────────────────────────────────────────────────────
let mode: ModeId = "classic";
let aimed: CategoryId | undefined;
let run = 0; // bumps on every new action; stale async flows check it and bail
let chain: ClipView[] = [];
let dub = true; // Waifu Dub: anime-trope voices for every quote
const score = { right: 0, total: 0, streak: 0 };

const alive = (r: number) => r === run;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function interrupt(): number {
  stopVoice();
  return ++run;
}

// ── Buttons ───────────────────────────────────────────────────────────
type Action = { label: string; onClick: () => void; tone?: "primary" | "danger" | "plain"; id: string; pressed?: boolean };

function setActions(list: Action[]) {
  actionsEl.replaceChildren(
    ...list.map((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.id = `act-${a.id}`;
      b.className = `toy-btn toy-btn-${a.tone ?? "plain"}`;
      b.textContent = a.label;
      if (a.pressed !== undefined) b.setAttribute("aria-pressed", String(a.pressed));
      b.addEventListener("click", a.onClick);
      return b;
    }),
  );
}

const pullAgain = (label = "Pull again"): Action => ({ id: "pull", label, tone: "primary", onClick: () => lever.pull() });

function sourceToggle(label = "Source"): Action {
  return {
    id: "source",
    label,
    pressed: false,
    onClick: () => {
      const cards = body.querySelectorAll<HTMLElement>(".clip-source");
      const open = [...cards].some((c) => c.hidden);
      cards.forEach((c) => (c.hidden = !open));
      document.getElementById("act-source")?.setAttribute("aria-pressed", String(open));
    },
  };
}

// ── Modes & aiming ────────────────────────────────────────────────────
for (const m of MODES) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "mode-btn";
  b.id = `mode-${m.id}`;
  b.textContent = m.label;
  b.addEventListener("click", () => setMode(m.id));
  modeNav.append(b);
}

function setMode(id: ModeId) {
  interrupt();
  mode = id;
  aimed = undefined;
  chain = [];
  modeNav.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.id === `mode-${id}`)));
  document.documentElement.classList.toggle("after-dark", id === "afterdark");
  const usesWheel = id !== "madlibs" && id !== "synergy";
  wheel.setAvailable(usesWheel ? deck.categoriesFor(id) : new Set(CATEGORY_IDS));
  wheel.setAimed(undefined);
  wheel.setLanded(undefined);
  renderIdle();
}

function aim(id: CategoryId) {
  const label = categoryById(id).label;
  if (mode === "madlibs" || mode === "synergy") return hint("This mode picks its own slices. Just pull.");
  if (!deck.categoriesFor(mode).has(id)) return hint(`Nothing under ${label} in this mode yet.`);
  sfx.tick();
  aimed = id;
  wheel.setAimed(id);
  void wheel.spinTo(id, 0);
  hint(`Aimed at ${label}. Pull the lever.`);
}

function takeAim(): CategoryId | undefined {
  const a = aimed;
  aimed = undefined;
  wheel.setAimed(undefined);
  return a;
}

function hint(text: string) {
  const el = document.getElementById("kn-hint");
  if (el) el.textContent = text;
  else $("toy-hint").textContent = text;
}

function renderModeLine() {
  const m = MODES.find((x) => x.id === mode)!;
  const scored = mode === "whosaid" || mode === "restore";
  knMode.innerHTML = `<span class="kn-mode-title">${esc(m.title)}</span>
    <span class="kn-mode-blurb">${esc(m.blurb)}</span>
    ${scored ? `<span class="kn-score">Score ${score.right}/${score.total} · streak ${score.streak}</span>` : ""}`;
}

function renderIdle() {
  renderModeLine();
  // Open on a finished example so the first screen shows what a pull does.
  const pool = deck.pool(mode === "synergy" || mode === "madlibs" ? "classic" : mode);
  const example = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  const exampleHtml =
    example && mode !== "madlibs"
      ? `<div class="example" aria-label="Example pull">
          <p class="example-label">Example pull</p>
          ${cardHtml(example, example.excerpt, `${example.archetype} says:`, { revealed: true })}
          ${meterHtml(contextIntegrity(example, example.excerpt))}
        </div>`
      : "";
  body.innerHTML = `
    <p class="kn-eyebrow">${NARRATOR_LINE}</p>
    <p class="kn-idle">Pull to disrupt.</p>
    <p class="kn-hint" id="kn-hint">Drag the red lever down, click it, or press Space. Tap a slice first to aim.</p>
    ${exampleHtml}`;
  setActions([pullAgain("Pull to disrupt")]);
}

// ── Casting ───────────────────────────────────────────────────────────
// Every line is performed by a voice key. If public/voices/manifest.json has an
// ElevenLabs take for that key and text, it plays; otherwise device speech does.

/** How the toy reads receipts aloud when Waifu Dub is off. */
const TOY_READER: SynthVoice = { pitch: 0.35, rate: 0.85 };

interface Performance {
  label: string;
  voiceKey: string;
  synth?: SynthVoice;
  /** Authentic clips only: 1 plays the original voice untouched. */
  playbackRate: number;
}

function performer(view: ClipView): Performance {
  const w = waifuFor(view.speakerKey);
  const waifu: SynthVoice = { pitch: w.pitch, rate: w.rate, feminine: true };
  switch (view.kind) {
    case "fictional":
      return dub
        ? { label: `voiced by ${w.name}`, voiceKey: `waifu:${w.id}`, synth: waifu, playbackRate: 1 }
        : { label: "executive voice", voiceKey: `exec:${view.speakerKey.replace("fictional:", "")}`, synth: view.voice, playbackRate: 1 };
    case "text":
      return dub
        ? { label: `read by ${w.name}`, voiceKey: `waifu:${w.id}`, synth: waifu, playbackRate: 1 }
        : { label: "read by the toy", voiceKey: "narrator", synth: TOY_READER, playbackRate: 1 };
    case "real":
      return dub
        ? { label: `voice altered: ${w.name}`, voiceKey: `waifu:${w.id}`, playbackRate: w.playbackRate }
        : { label: "original voice", voiceKey: "original", playbackRate: 1 };
  }
}

/** A standalone line (Mad Libs piece, operator, analyst): pre-rendered take or device speech. */
async function performLine(voiceKey: string, text: string, synth: SynthVoice): Promise<void> {
  const take = findTake(voiceKey, text);
  if (take) await playWindow(take.file, take.start, take.end);
  else await speak(text, synth, voiceKey);
}

/** Start downloading a clip's audio now, so it's decoded by the time the narrator finishes. */
function prefetch(view: ClipView) {
  const cast = performer(view);
  const clip = view.clip;
  if (clip.kind === "real") {
    preload(findTake(cast.voiceKey, `sts:${clip.audioFile}`)?.file ?? clip.audioFile);
    return;
  }
  const take = findTake(cast.voiceKey, view.fullText);
  if (take) preload(take.file);
}

/** The pull-string narrator, shown as the toy's own printed line while it talks. */
async function narrator(r: number): Promise<boolean> {
  body.insertAdjacentHTML("afterbegin", `<p class="narrator-line" aria-hidden="true">${NARRATOR_LINE}</p>`);
  const take = findTake("narrator", NARRATOR_SPEECH);
  await narrate(take ? publicUrl(take.file) : narratorUrl, NARRATOR_SPEECH);
  return alive(r);
}

// ── Shared pieces ─────────────────────────────────────────────────────
function cardHtml(view: ClipView, step: Step, who: string, opts: { revealed?: boolean } = {}): string {
  const q = quoteHtml(step.text, { lead: step.start > 0, trail: step.end < view.fullText.length });
  return `<article class="clip-card${opts.revealed ? " is-revealed" : ""}" data-kind="${view.kind}">
    <header class="clip-head"><span class="who">${esc(who)}</span><span class="badges">${kindBadge(view, step, performer(view).label, unreviewed(view))}</span></header>
    ${q}
    <div class="clip-source" hidden>${sourceHtml(view, unreviewed(view))}</div>
  </article>`;
}

const seamHtml = () => `<div class="seam" aria-hidden="true"><span>separate source</span></div>`;
const unreviewed = (view: ClipView) => catalog.unreviewed.has(view.clip.id);

async function say(view: ClipView, step: Step, quote: Element | null): Promise<void> {
  const cast = performer(view);
  const clip = view.clip;
  let plan: { file: string; startMs: number; endMs?: number; rate: number } | null = null;
  if (clip.kind === "real") {
    // Waifu Dub on a real clip: the ElevenLabs voice-changer take if rendered, else a pitch-up.
    const sts = dub ? findTake(cast.voiceKey, `sts:${clip.audioFile}`) : undefined;
    plan = sts
      ? { file: sts.file, startMs: sts.start + (step.audio?.startMs ?? 0), endMs: step.audio && sts.start + step.audio.endMs, rate: 1 }
      : { file: clip.audioFile, startMs: step.audio?.startMs ?? 0, endMs: step.audio?.endMs, rate: cast.playbackRate };
  } else {
    const take = findTake(cast.voiceKey, view.fullText);
    if (take) {
      const w = windowOf(take, view.fullText, step.start, step.end);
      plan = { file: take.file, startMs: w.startMs, endMs: w.endMs, rate: 1 };
    }
  }
  const ms =
    plan?.endMs !== undefined ? (plan.endMs - plan.startMs) / plan.rate : estimateMs(step.text, cast.synth?.rate ?? 1);
  const finish = quote ? revealWords(quote, ms) : () => {};
  try {
    if (plan) await playWindow(plan.file, plan.startMs, plan.endMs, plan.rate);
    else await speak(step.text, cast.synth!, cast.voiceKey);
  } catch (err) {
    after()?.insertAdjacentHTML("beforeend", `<p class="error">Couldn't play this clip: ${esc((err as Error).message)}</p>`);
  } finally {
    finish();
  }
}

async function spinAndDraw(r: number): Promise<ClipView | null> {
  const cat = deck.chooseCategory(mode, takeAim());
  wheel.setLanded(undefined);
  body.innerHTML = `<p class="kn-eyebrow">Spinning…</p>`;
  setActions([]);
  await wheel.spinTo(cat);
  if (!alive(r)) return null;
  wheel.setLanded(cat);
  const view = deck.draw(mode, cat);
  prefetch(view);
  return view;
}

// ── Classic ───────────────────────────────────────────────────────────
async function classic(r: number) {
  const view = await spinAndDraw(r);
  if (!view) return;
  chain = [view];
  await presentSingle(view, r, `${view.archetype} says:`);
}

async function presentSingle(view: ClipView, r: number, who: string, lead = "") {
  body.innerHTML = `${lead}<div class="clip-list">${cardHtml(view, view.excerpt, who)}</div><div id="kn-after"></div>`;
  setActions([pullAgain()]);
  if (!(await narrator(r))) return;
  sfx.scratch();
  await sleep(420);
  if (!alive(r)) return;
  await say(view, view.excerpt, body.querySelector(".clip-card:last-child .quote"));
  if (!alive(r)) return;
  after()!.innerHTML = meterHtml(contextIntegrity(view, view.excerpt));
  after()!.classList.add("stamp");
  sfx.thunk();
  setActions(classicActions(view));
}

function classicActions(view: ClipView): Action[] {
  return [
    sourceToggle(),
    { id: "restore", label: "Restore context", onClick: () => void restore(view) },
    ...(chain.length < 5 ? [{ id: "worse", label: "Make it worse", tone: "danger" as const, onClick: () => void worse() }] : []),
    pullAgain(),
  ];
}

async function worse() {
  const r = interrupt();
  const next = deck.followUp(chain);
  prefetch(next);
  chain.push(next);
  const list = body.querySelector(".clip-list");
  if (!list) return;
  body.querySelectorAll(".clip-card").forEach((c) => c.classList.add("is-revealed"));
  list.insertAdjacentHTML("beforeend", seamHtml() + cardHtml(next, next.excerpt, `${next.archetype} adds:`));
  after()!.innerHTML = "";
  after()!.classList.remove("stamp");
  setActions([pullAgain()]);
  sfx.scratch();
  await sleep(380);
  if (!alive(r)) return;
  await say(next, next.excerpt, list.querySelector(".clip-card:last-child .quote"));
  if (!alive(r)) return;
  after()!.innerHTML = coincidenceNote(chain.length);
  sfx.thunk();
  setActions(classicActions(chain[0]));
}

function coincidenceNote(n: number) {
  return disclaimerHtml(
    "Corporate sentence generated by coincidence",
    `These ${n} speakers were not talking to each other. Each card comes from a separate source.`,
  );
}

async function restore(view: ClipView, verdictLead = "") {
  const r = interrupt();
  const full = view.steps[0];
  const receipt = view.kind === "text";
  body.innerHTML = receipt
    ? `<p class="kn-eyebrow">Context restored · here's the receipt</p>
       ${receiptHtml(view, view.excerpt, unreviewed(view))}
       <div id="kn-after">${meterHtml(100)}</div>`
    : `<article class="clip-card is-restored">
         <header class="clip-head"><span class="who">Context restored · ${esc(view.archetype)}</span><span class="badges">${kindBadge(view, full, performer(view).label, unreviewed(view))}</span></header>
         ${cutHtml(view, view.excerpt)}
         <div class="clip-source" hidden>${sourceHtml(view, unreviewed(view))}</div>
       </article>
       <div id="kn-after">${meterHtml(100)}</div>`;
  setActions(receipt ? [pullAgain()] : [sourceToggle(), pullAgain()]);
  await say(view, full, null);
  if (!alive(r)) return;
  const note = view.clip.contextMakesItWorse
    ? disclaimerHtml(`${verdictLead}Context restored. It did not help.`, `They were talking about: ${view.clip.topic}.`)
    : disclaimerHtml(`${verdictLead}Context restored.`, `They were talking about: ${view.clip.topic}.`);
  after()!.insertAdjacentHTML("beforeend", note);
}

// ── Context Annihilator ───────────────────────────────────────────────
async function annihilator(r: number) {
  const view = await spinAndDraw(r);
  if (!view) return;
  chain = [view];
  await showCut(view, 0, r);
}

async function showCut(view: ClipView, idx: number, r: number) {
  const step = view.steps[idx];
  const prev = view.steps[Math.max(0, idx - 1)];
  const last = idx === view.steps.length - 1;
  body.innerHTML = `
    <article class="clip-card is-annihilating">
      <header class="clip-head"><span class="who">${esc(view.archetype)} says:</span><span class="badges">${kindBadge(view, step, performer(view).label, unreviewed(view))}</span></header>
      ${cutHtml(view, step, prev)}
      <div class="clip-source" hidden>${sourceHtml(view, unreviewed(view))}</div>
    </article>
    <div id="kn-after">${meterHtml(contextIntegrity(view, step))}</div>`;
  const cutNext: Action = {
    id: "cut",
    label: idx === 0 ? "Start cutting" : "Cut deeper",
    tone: "danger",
    onClick: () => void showCut(view, idx + 1, interrupt()),
  };
  setActions(last ? [pullAgain()] : [cutNext, pullAgain()]);
  if (idx === 0 && !(await narrator(r))) return;
  if (idx > 0) sfx.scratch();
  await sleep(idx > 0 ? 350 : 0);
  if (!alive(r)) return;
  await say(view, step, null);
  if (!alive(r)) return;
  if (last) {
    after()!.insertAdjacentHTML("beforeend", `<p class="annihilated">Fully annihilated</p>`);
    after()!.classList.add("stamp");
    sfx.thunk();
    setActions([
      sourceToggle(),
      { id: "restore", label: "Restore context", onClick: () => void restore(view) },
      pullAgain(),
    ]);
  }
}

// ── Synergy ───────────────────────────────────────────────────────────
async function synergy(r: number, trio = deck.synergy()) {
  chain = trio;
  trio.forEach(prefetch);
  wheel.setLanded(undefined);
  body.innerHTML = `<div class="clip-list"></div><div id="kn-after"></div>`;
  setActions([pullAgain()]);
  const list = body.querySelector(".clip-list")!;
  if (!(await narrator(r))) return;
  for (const [i, v] of trio.entries()) {
    await wheel.spinTo(v.clip.category, i === 0 ? 2 : 1);
    if (!alive(r)) return;
    wheel.setLanded(v.clip.category);
    list.insertAdjacentHTML("beforeend", (i ? seamHtml() : "") + cardHtml(v, v.excerpt, `Clip ${i + 1} of 3 · ${v.archetype}`));
    sfx.scratch();
    await sleep(350);
    if (!alive(r)) return;
    await say(v, v.excerpt, list.querySelector(".clip-card:last-child .quote"));
    if (!alive(r)) return;
    await sleep(200);
  }
  after()!.innerHTML = coincidenceNote(3);
  sfx.thunk();
  setActions([
    sourceToggle("Sources"),
    { id: "replay", label: "Replay", onClick: () => void synergy(interrupt(), trio) },
    pullAgain(),
  ]);
}

// ── Corporate Mad Libs ────────────────────────────────────────────────
async function madlibs(r: number, pieces = buildMadLib()) {
  wheel.setLanded(undefined);
  body.innerHTML = `
    <p class="kn-eyebrow">A fictional executive says:</p>
    <p class="ransom" aria-label="${esc(pieces.map((p) => p.text).join(" "))}"></p>
    <div id="kn-after"></div>`;
  setActions([pullAgain()]);
  void wheel.spinTo(pick(CATEGORY_IDS), 3);
  for (const piece of pieces) {
    const w = waifuFor(`fictional:${piece.speakerId}`);
    const take = findTake(dub ? `waifu:${w.id}` : `exec:${piece.speakerId}`, piece.text);
    if (take) preload(take.file);
  }
  if (!(await narrator(r))) return;
  const ransom = body.querySelector(".ransom")!;
  for (const [i, piece] of pieces.entries()) {
    const s = speakerById(piece.speakerId);
    const key = `fictional:${s.id}`;
    const w = waifuFor(key);
    const credit = dub ? `${s.name} as ${w.name}` : s.name;
    const tilt = ((i * 37) % 7) - 3;
    ransom.insertAdjacentHTML(
      "beforeend",
      `<span class="tile tile-${i % 5}" style="--tilt:${tilt}deg"><span class="tile-text">${esc(piece.text)}</span><span class="tile-who" hidden>${esc(credit)}</span></span>`,
    );
    await performLine(dub ? `waifu:${w.id}` : `exec:${s.id}`, piece.text, dub ? { pitch: w.pitch, rate: w.rate, feminine: true } : s.voice);
    if (!alive(r)) return;
  }
  const speakers = new Set(pieces.map((p) => p.speakerId)).size;
  after()!.innerHTML = disclaimerHtml(
    `Spliced from ${pieces.length} fake recordings`,
    `${speakers} fictional executives, zero real people. Splicing is only allowed here because nobody in it exists.`,
  );
  sfx.thunk();
  setActions([
    {
      id: "who",
      label: "Who’s in it",
      pressed: false,
      onClick: () => {
        const tags = body.querySelectorAll<HTMLElement>(".tile-who");
        const show = [...tags].some((t) => t.hidden);
        tags.forEach((t) => (t.hidden = !show));
        document.getElementById("act-who")?.setAttribute("aria-pressed", String(show));
      },
    },
    { id: "replay", label: "Replay", onClick: () => void madlibs(interrupt(), pieces) },
    pullAgain("Splice another"),
  ]);
}

// ── Who Said That? ────────────────────────────────────────────────────
async function whoSaid(r: number) {
  const view = await spinAndDraw(r);
  if (!view) return;
  chain = [view];
  // A slightly longer cut than the excerpt gives the player something to go on.
  const step = view.steps.length > 2 ? view.steps[view.steps.length - 2] : view.excerpt;
  const choices = deck.whoSaidChoices(view);
  body.innerHTML = `
    <div class="clip-list">${cardHtml(view, step, "Someone says:")}</div>
    <p class="prompt">Who said that?</p>
    <div class="choices">${choices
      .map((c, i) => `<button type="button" class="choice" id="choice-${i}" data-key="${esc(c.key)}"><strong>${esc(c.name)}</strong><span>${esc(c.archetype)} · ${esc(c.company)}</span></button>`)
      .join("")}</div>
    <div id="kn-after"></div>`;
  setActions([pullAgain("Skip")]);
  let answered = false;
  body.querySelectorAll<HTMLButtonElement>(".choice").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      interrupt();
      const correct = btn.dataset.key === view.speakerKey;
      tally(correct);
      body.querySelectorAll<HTMLButtonElement>(".choice").forEach((b) => {
        b.disabled = true;
        if (b.dataset.key === view.speakerKey) b.classList.add("is-correct");
        else if (b === btn) b.classList.add("is-wrong");
      });
      const who = body.querySelector(".clip-card .who")!;
      who.textContent = `${view.name}, ${view.company}`;
      after()!.innerHTML = `<p class="verdict ${correct ? "is-correct" : "is-wrong"}">${correct ? "Correct." : `Nope. That was ${esc(view.name)}.`}</p>`;
      setActions([sourceToggle(), { id: "restore", label: "Restore context", onClick: () => void restore(view) }, pullAgain()]);
    }),
  );
  if (!(await narrator(r))) return;
  sfx.scratch();
  await sleep(400);
  if (!alive(r)) return;
  await say(view, step, body.querySelector(".clip-card .quote"));
}

function tally(correct: boolean) {
  score.total++;
  if (correct) {
    score.right++;
    score.streak++;
    sfx.ding();
  } else {
    score.streak = 0;
    sfx.buzz();
  }
  renderModeLine();
}

// ── Context Restoration ───────────────────────────────────────────────
async function restoreGame(r: number) {
  const view = await spinAndDraw(r);
  if (!view) return;
  chain = [view];
  const options = topicChoices(view);
  body.innerHTML = `
    <div class="clip-list">${cardHtml(view, view.excerpt, `${view.archetype} says:`)}</div>
    <p class="prompt">What were they actually talking about?</p>
    <div class="choices">${options
      .map((o, i) => `<button type="button" class="choice" id="choice-${i}" data-correct="${o.correct}"><strong>${esc(o.topic)}</strong></button>`)
      .join("")}</div>
    <div id="kn-after"></div>`;
  setActions([pullAgain("Skip")]);
  let answered = false;
  body.querySelectorAll<HTMLButtonElement>(".choice").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const correct = btn.dataset.correct === "true";
      tally(correct);
      void restore(view, correct ? "Correct. " : "Nope. ");
    }),
  );
  if (!(await narrator(r))) return;
  sfx.scratch();
  await sleep(400);
  if (!alive(r)) return;
  await say(view, view.excerpt, body.querySelector(".clip-card .quote"));
}

// ── Earnings Call After Dark ──────────────────────────────────────────
async function afterDark(r: number) {
  const view = await spinAndDraw(r);
  if (!view) return;
  chain = [view];
  const log: string[] = [];
  const paint = () => `<ol class="call-log">${log.join("")}</ol>`;
  body.innerHTML = paint();
  sfx.callBeep();
  await sleep(450);
  if (!alive(r)) return;

  const line = async (who: string, text: string, voiceKey: string, synth: SynthVoice) => {
    log.push(`<li><span class="call-who">${esc(who)}</span> ${esc(text)}</li>`);
    body.innerHTML = paint();
    await performLine(voiceKey, text, synth);
  };

  if (view.clip.kind === "fictional") {
    const analyst = pick(ANALYSTS);
    await line("Operator", operatorIntro(analyst), "operator", OPERATOR_VOICE);
    if (!alive(r)) return;
    await line(analyst.name, pick(ANALYST_QUESTIONS), "analyst", { pitch: 1.25, rate: 1.1 });
  } else {
    // Never invent a question for a real executive to have "answered".
    await line("Operator", operatorExcerpt(view.clip.sourceTitle), "operator", OPERATOR_VOICE);
  }
  if (!alive(r)) return;
  const note =
    view.kind !== "fictional"
      ? `<p class="call-note">The operator is fictional. What follows is real, and it was not a reply to anything above.</p>`
      : "";
  await presentSingle(view, r, `${view.archetype} responds:`, paint() + note);
}

// ── Pull ──────────────────────────────────────────────────────────────
let warmed = false;
async function pull() {
  const r = interrupt();
  sfx.audioContext();
  if (!warmed) {
    warmed = true;
    catalog.real.forEach((c) => preload(c.audioFile));
  }
  after()?.classList.remove("stamp");
  switch (mode) {
    case "classic":
      return classic(r);
    case "annihilator":
      return annihilator(r);
    case "synergy":
      return synergy(r);
    case "madlibs":
      return madlibs(r);
    case "whosaid":
      return whoSaid(r);
    case "restore":
      return restoreGame(r);
    case "afterdark":
      return afterDark(r);
  }
}

document.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (e.key === " " && !e.repeat && !target.closest("button, a, input, textarea, [role=button]")) {
    e.preventDefault();
    lever.pull();
  }
});

// ── Footer ────────────────────────────────────────────────────────────
const muteBtn = $("mute");
muteBtn.addEventListener("click", () => {
  sfx.setMuted(!sfx.isMuted());
  muteBtn.setAttribute("aria-pressed", String(sfx.isMuted()));
  muteBtn.textContent = sfx.isMuted() ? "Sound off" : "Sound on";
  if (sfx.isMuted()) stopVoice();
});

const dubBtn = $("dub");
dubBtn.addEventListener("click", () => {
  dub = !dub;
  dubBtn.setAttribute("aria-pressed", String(dub));
  dubBtn.textContent = dub ? "Waifu dub on" : "Waifu dub off";
  body.querySelectorAll(".clip-card").length && hint(dub ? "Waifu Dub on for the next pull." : "Original voices on the next pull.");
});

const rejected = catalog.report.rejected.length + catalog.textReport.rejected.length;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
$("catalog-stats").textContent =
  `${catalog.fictional.length} fictional lines from ${FICTIONAL_SPEAKERS.length} invented executives · ` +
  `${plural(catalog.real.length, "authentic clip")} · ${plural(catalog.text.length - catalog.unreviewed.size, "receipt")}` +
  (catalog.unreviewed.size ? ` (+${catalog.unreviewed.size} awaiting review, dev only)` : "") +
  (rejected ? ` · ${rejected} held back by the provenance check` : "");

void Promise.all([loadTakes(), canSpeak()]).then(([takes, speech]) => {
  $("voice-status").textContent = takes
    ? `${plural(takes, "pre-rendered voice take")} loaded; anything missing falls back to device speech.`
    : speech
      ? "Voices come from your device’s speech synthesizer."
      : "No speech voices found on this device, so lines appear as text.";
});

setMode("classic");
