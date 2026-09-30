import "../styles.css";
import "./ingest.css";
import type { CategoryId, ClipTag, RealClip } from "../types.ts";
import { CATEGORIES } from "../catalog/categories.ts";
import { validateReal } from "../catalog/validate.ts";

// All times here are milliseconds from the start of the loaded file. The
// record's times are rebased to the context window, because that window is
// what gets cut into public/audio/.

type Win = { start: number; end: number };
type StageWin = Win & { text: string };

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const val = (id: string) => $(id).value.trim();

let ac: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let fileName = "source.mp4";
let ctxWin: Win = { start: 0, end: 0 };
let excerpt: Win = { start: 0, end: 0 };
let stages: StageWin[] = [];
let playing: AudioBufferSourceNode | null = null;
let playhead: { at: number; from: number; to: number } | null = null;

// ── Time text ─────────────────────────────────────────────────────────
function parseTime(text: string): number | null {
  const parts = text.trim().split(":").map(Number);
  if (!parts.length || parts.some((p) => Number.isNaN(p))) return null;
  const secs = parts.reduce((acc, p) => acc * 60 + p, 0);
  return Math.round(secs * 1000);
}

function fmt(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = (total % 60).toFixed(3).padStart(6, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// ── Waveforms ─────────────────────────────────────────────────────────
const overview = $<HTMLCanvasElement>("overview");
const detail = $<HTMLCanvasElement>("detail");
const css = getComputedStyle(document.documentElement);
const color = (token: string) => css.getPropertyValue(token).trim();

function durationMs() {
  return buffer ? buffer.duration * 1000 : 0;
}

function detailRange(): Win {
  return ctxWin.end > ctxWin.start ? ctxWin : { start: 0, end: durationMs() };
}

function drawWave(canvas: HTMLCanvasElement, range: Win, regions: { win: Win; fill: string }[]) {
  const dpr = window.devicePixelRatio || 1;
  const w = (canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr)));
  const h = (canvas.height = Math.round(canvas.clientHeight * dpr));
  const g = canvas.getContext("2d")!;
  g.fillStyle = color("--slide-raise");
  g.fillRect(0, 0, w, h);
  if (!buffer || range.end <= range.start) return;
  const x = (ms: number) => ((ms - range.start) / (range.end - range.start)) * w;
  for (const r of regions) {
    g.fillStyle = r.fill;
    g.fillRect(x(r.win.start), 0, Math.max(1, x(r.win.end) - x(r.win.start)), h);
  }
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  const s0 = Math.floor((range.start / 1000) * sr);
  const perPx = Math.max(1, Math.floor((((range.end - range.start) / 1000) * sr) / w));
  g.fillStyle = color("--text");
  for (let px = 0; px < w; px++) {
    let lo = 1;
    let hi = -1;
    const from = s0 + px * perPx;
    for (let i = from; i < from + perPx && i < data.length; i += Math.max(1, perPx >> 6)) {
      const v = data[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (hi < lo) continue;
    g.fillRect(px, ((1 - hi) / 2) * h, 1, Math.max(1, ((hi - lo) / 2) * h));
  }
  if (playhead) {
    const now = playhead.from + (performance.now() - playhead.at);
    if (now >= range.start && now <= range.end) {
      g.fillStyle = color("--warning");
      g.fillRect(x(now), 0, 2 * dpr, h);
    }
  }
}

/** Canvas can't always parse color-mix(), so turn a hex token into rgba(). */
function tint(token: string, alpha: number) {
  const hex = color(token).replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
}

function redraw() {
  drawWave(overview, { start: 0, end: durationMs() }, [{ win: ctxWin, fill: tint("--ring", 45) }]);
  drawWave(detail, detailRange(), [
    ...stages.map((s) => ({ win: s, fill: tint("--gold-2", 22) })),
    { win: excerpt, fill: tint("--lever", 50) },
  ]);
}

function bindDrag(canvas: HTMLCanvasElement, range: () => Win) {
  let anchor: number | null = null;
  const toMs = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    const r = range();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    return Math.round(r.start + f * (r.end - r.start));
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (!buffer) return;
    anchor = toMs(e);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (anchor === null) return;
    const now = toMs(e);
    applyMark({ start: Math.min(anchor, now), end: Math.max(anchor, now) }, false, canvas === overview);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (anchor === null) return;
    const now = toMs(e);
    const win = { start: Math.min(anchor, now), end: Math.max(anchor, now) };
    anchor = null;
    if (win.end - win.start > 30) applyMark(win, true, canvas === overview);
  });
}

function applyMark(win: Win, final: boolean, fromOverview: boolean) {
  const mode = fromOverview ? "context" : (document.querySelector<HTMLInputElement>("input[name=mark]:checked")?.value ?? "excerpt");
  if (mode === "context") ctxWin = win;
  else if (mode === "excerpt") excerpt = win;
  else if (final) stages.push({ ...win, text: "" });
  if (final) {
    syncTimeInputs();
    renderStages();
    update();
  } else {
    redraw();
  }
}

// ── Inputs ────────────────────────────────────────────────────────────
function syncTimeInputs() {
  $("ctx-start").value = fmt(ctxWin.start);
  $("ctx-end").value = fmt(ctxWin.end);
  $("ex-start").value = fmt(excerpt.start);
  $("ex-end").value = fmt(excerpt.end);
}

function readTimeInputs() {
  const t = (id: string, fallback: number) => parseTime(val(id)) ?? fallback;
  ctxWin = { start: t("ctx-start", ctxWin.start), end: t("ctx-end", ctxWin.end) };
  excerpt = { start: t("ex-start", excerpt.start), end: t("ex-end", excerpt.end) };
}

function renderStages() {
  const list = $<HTMLOListElement>("stages");
  list.replaceChildren(
    ...stages.map((s, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="stage-time">${fmt(s.start)} → ${fmt(s.end)}</span>
        <input id="stage-text-${i}" placeholder="Exact words in this stage" />
        <button type="button" class="pill" id="stage-play-${i}">Play</button>
        <button type="button" class="pill" id="stage-remove-${i}">Remove</button>`;
      const input = li.querySelector("input")!;
      input.value = s.text;
      input.addEventListener("input", () => {
        s.text = input.value;
        update();
      });
      li.querySelector(`#stage-play-${i}`)!.addEventListener("click", () => play(s));
      li.querySelector(`#stage-remove-${i}`)!.addEventListener("click", () => {
        stages.splice(i, 1);
        renderStages();
        update();
      });
      return li;
    }),
  );
  if (stages.length) list.insertAdjacentHTML("afterbegin", `<p class="help">Stages play widest first; each must sit inside the one before it, and the excerpt inside the last.</p>`);
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

function buildRecord(): RealClip {
  const id = val("id") || slug(`${val("speaker")} ${val("topic")}`) || "new-clip";
  const tags: ClipTag[] = [];
  if ($("tag-earnings").checked) tags.push("earnings-call");
  if ($("tag-open").checked) tags.push("synergy:open");
  if ($("tag-mid").checked) tags.push("synergy:mid");
  if ($("tag-close").checked) tags.push("synergy:close");
  const rel = (ms: number) => Math.round(ms - ctxWin.start);
  const ordered = [...stages].sort((a, b) => b.end - b.start - (a.end - a.start));
  const record: RealClip = {
    kind: "real",
    id,
    speaker: val("speaker"),
    companyAtTime: val("company"),
    archetype: val("archetype").toUpperCase(),
    category: val("category") as CategoryId,
    absurdity: Number(val("absurdity")),
    topic: val("topic"),
    decoyTopics: [val("decoy-0"), val("decoy-1"), val("decoy-2")],
    audioFile: `audio/${id}.m4a`,
    contextTranscript: $<HTMLTextAreaElement>("transcript").value.trim(),
    quoteExact: $<HTMLTextAreaElement>("quote").value.trim(),
    startTimeMs: rel(excerpt.start),
    endTimeMs: rel(excerpt.end),
    ...(ordered.length ? { stages: ordered.map((s) => ({ startMs: rel(s.start), endMs: rel(s.end), text: s.text.trim() })) } : {}),
    sourceUrl: val("source-url"),
    sourceTitle: val("source-title"),
    sourceDate: val("source-date"),
    sourceOffsetMs: (parseTime(val("file-offset")) ?? 0) + Math.round(ctxWin.start),
    review: { by: val("review-by"), at: val("review-at") },
    ...(tags.length ? { tags } : {}),
    ...($("worse").checked ? { contextMakesItWorse: true } : {}),
  };
  return record;
}

function update() {
  readTimeInputs();
  $("absurdity-out").textContent = val("absurdity");
  const record = buildRecord();
  const { errors, warnings } = validateReal(record);
  if (!buffer) errors.unshift("load the source audio");
  if (ctxWin.end - ctxWin.start < 5000) errors.push("mark a context window of at least 5 s");
  if (excerpt.start < ctxWin.start || excerpt.end > ctxWin.end) errors.push("the excerpt must sit inside the context window");
  $("checks").innerHTML = errors.length
    ? `<p class="bad">Not ready: ${errors.length} problem${errors.length === 1 ? "" : "s"}</p><ul>${errors.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`
    : `<p class="good">Passes the provenance check.</p>`;
  if (warnings.length) $("checks").insertAdjacentHTML("beforeend", `<ul class="warn">${warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>`);
  const secs = (ms: number) => (ms / 1000).toFixed(3);
  $("ffmpeg").textContent = `ffmpeg -ss ${secs(ctxWin.start)} -to ${secs(ctxWin.end)} -i "${fileName}" -vn -ac 1 -c:a aac -b:a 96k public/audio/${record.id}.m4a`;
  $("json").textContent = JSON.stringify(record, null, 2);
  redraw();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

// ── Playback ──────────────────────────────────────────────────────────
function stop() {
  try {
    playing?.stop();
  } catch {
    /* already stopped */
  }
  playing = null;
  playhead = null;
  redraw();
}

function play(win: Win) {
  if (!buffer || !ac || win.end <= win.start) return;
  stop();
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.connect(ac.destination);
  src.start(0, win.start / 1000, (win.end - win.start) / 1000);
  src.onended = () => {
    if (playing === src) stop();
  };
  playing = src;
  playhead = { at: performance.now(), from: win.start, to: win.end };
  const tickFrame = () => {
    if (playing !== src) return;
    redraw();
    requestAnimationFrame(tickFrame);
  };
  requestAnimationFrame(tickFrame);
}

// ── Wiring ────────────────────────────────────────────────────────────
$<HTMLSelectElement>("category").innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("");
$("review-at").value = new Date().toISOString().slice(0, 10);

$("file").addEventListener("change", async () => {
  const file = $("file").files?.[0];
  if (!file) return;
  fileName = file.name;
  ac ??= new AudioContext();
  $("checks").innerHTML = `<p>Decoding ${escapeHtml(file.name)}…</p>`;
  try {
    buffer = await ac.decodeAudioData(await file.arrayBuffer());
  } catch {
    buffer = null;
    $("checks").innerHTML = `<p class="bad">This browser can't decode ${escapeHtml(file.name)}. Convert it first: ffmpeg -i "${escapeHtml(file.name)}" -vn source.m4a</p>`;
    return;
  }
  const d = durationMs();
  ctxWin = { start: 0, end: Math.min(d, 45_000) };
  excerpt = { start: 0, end: Math.min(d, 2_000) };
  stages = [];
  syncTimeInputs();
  renderStages();
  update();
});

bindDrag(overview, () => ({ start: 0, end: durationMs() }));
bindDrag(detail, detailRange);
document.querySelector(".ing-grid")!.addEventListener("input", (e) => {
  if ((e.target as HTMLElement).id !== "file") update();
});
$("play-context").addEventListener("click", () => play(ctxWin));
$("play-excerpt").addEventListener("click", () => play(excerpt));
$("stop").addEventListener("click", stop);
window.addEventListener("resize", redraw);

for (const [btn, src] of [["copy-ffmpeg", "ffmpeg"], ["copy-json", "json"]] as const) {
  $(btn).addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($(src).textContent ?? "");
      $(btn).textContent = "Copied";
    } catch {
      getSelection()?.selectAllChildren($(src));
      $(btn).textContent = "Selected";
    }
    setTimeout(() => ($(btn).textContent = "Copy"), 1500);
  });
}

update();
