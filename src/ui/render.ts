import type { TextMedium } from "../types.ts";
import type { ClipView, Step } from "../engine/clip-view.ts";
import { contextIntegrity, sourceLink } from "../engine/clip-view.ts";
import { textHash } from "../audio/take-math.ts";

// Small HTML builders for the keynote panel. Everything user-visible that comes
// from the catalog goes through esc(), since real clips arrive as JSON.

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const MEDIUM_LABEL: Record<TextMedium, string> = {
  tweet: "Tweet",
  post: "Social post",
  im: "Instant message",
  email: "Email",
  filing: "Regulatory filing",
  letter: "Letter",
  blog: "Blog post",
  memo: "Internal memo",
};

/** Which kind of source this is, and who is performing it. */
export function kindBadge(view: ClipView, step: Step, voiceLabel: string, unreviewed = false): string {
  const flag = unreviewed ? `<span class="badge badge-pending">Unreviewed · dev only</span>` : "";
  if (view.clip.kind === "fictional") return `<span class="badge badge-fake">Fictional exec · ${esc(voiceLabel)}</span>`;
  if (view.clip.kind === "text") {
    return `<span class="badge badge-real">Receipt · ${MEDIUM_LABEL[view.clip.medium]}</span><span class="badge badge-fake">${esc(voiceLabel)}</span>${flag}`;
  }
  const a = step.audio;
  const secs = a ? ` · ${((a.endMs - a.startMs) / 1000).toFixed(1)} s` : "";
  return `<span class="badge badge-real">Authentic words${secs}</span><span class="badge badge-fake">${esc(voiceLabel)}</span>`;
}

/** Quote text split into words so it can be revealed in time with the voice. */
export function quoteHtml(text: string, opts: { lead?: boolean; trail?: boolean; size?: "xl" | "md" } = {}): string {
  const words = text.split(/(\s+)/).map((w) => (/^\s+$/.test(w) ? w : `<span class="w">${esc(w)}</span>`)).join("");
  // After a full stop, the "more follows" ellipsis needs a space: "know. …" not "know.…".
  const trail = opts.trail === false ? "”" : /[.!?,;:]$/.test(text) ? "\u2009…”" : "…”";
  return `<blockquote class="quote quote-${opts.size ?? "xl"}"><span class="ellipsis">${opts.lead === false ? "“" : "“…"}</span>${words}<span class="ellipsis">${trail}</span></blockquote>`;
}

/**
 * The whole context with the kept cut highlighted. Text cut by earlier steps is
 * struck quietly; text cut by this step (between `prev` and `step`) gets the
 * animated strike.
 */
export function cutHtml(view: ClipView, step: Step, prev: Step = step): string {
  const t = view.fullText;
  const seg = (a: number, b: number, cls: string) => (b > a ? `<span class="${cls}">${esc(t.slice(a, b))}</span>` : "");
  return `<p class="cut-text">${seg(0, prev.start, "cut")}${seg(prev.start, step.start, "cut cut-new")}<mark class="kept">${esc(t.slice(step.start, step.end))}</mark>${seg(step.end, prev.end, "cut cut-new")}${seg(prev.end, t.length, "cut")}</p>`;
}

export function meterHtml(pct: number, label = "Context integrity"): string {
  const level = pct <= 15 ? "critical" : pct <= 50 ? "warning" : "ok";
  return `<div class="meter meter-${level}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(label)}">
    <div class="meter-row"><span class="meter-label">${esc(label)}</span><span class="meter-value">${pct}%</span></div>
    <div class="meter-track"><div class="meter-fill" style="width:${pct}%"></div></div>
  </div>`;
}

export function sourceHtml(view: ClipView, unreviewed = false): string {
  if (view.clip.kind === "text") return receiptHtml(view, view.excerpt, unreviewed);
  if (view.kind === "fictional") {
    return `<dl class="source-card">
      <dt>Speaker</dt><dd><strong>${esc(view.name)}</strong>, ${esc(view.title)}, ${esc(view.company)}</dd>
      <dt>Bio</dt><dd>${esc(view.bio ?? "")}</dd>
      <dt>Source</dt><dd>The See ’n Say writers’ room. This executive does not exist. Their valuation does.</dd>
    </dl>`;
  }
  const clip = view.clip;
  if (clip.kind !== "real") return "";
  const link = sourceLink(view);
  const a = view.excerpt.audio!;
  return `<dl class="source-card">
    <dt>Speaker</dt><dd><strong>${esc(view.name)}</strong>, ${esc(view.company)} (at the time)</dd>
    <dt>Source</dt><dd><a href="${esc(link?.href ?? clip.sourceUrl)}" target="_blank" rel="noopener">${esc(clip.sourceTitle)}</a>, ${esc(clip.sourceDate)}</dd>
    <dt>Timestamp</dt><dd>${esc(link?.stamp ?? "")} · excerpt is ${((a.endMs - a.startMs) / 1000).toFixed(1)} s, contiguous, unedited</dd>
    <dt>Verified</dt><dd>Transcript checked by ${esc(clip.review.by)} on ${esc(clip.review.at)}</dd>
  </dl>`;
}

export function disclaimerHtml(title: string, body: string): string {
  return `<div class="system-note" role="note">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18v.5"/></svg>
    <div><strong>${esc(title)}</strong><span>${esc(body)}</span></div>
  </div>`;
}

/** Reveals .w spans one at a time over `ms`. Returns a function that shows the rest at once. */
export function revealWords(root: Element, ms: number): () => void {
  const words = [...root.querySelectorAll<HTMLElement>(".w")];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !words.length) {
    words.forEach((w) => w.classList.add("on"));
    return () => {};
  }
  let i = 0;
  const step = Math.max(40, ms / words.length);
  const timer = setInterval(() => {
    words[i++]?.classList.add("on");
    if (i >= words.length) clearInterval(timer);
  }, step);
  return () => {
    clearInterval(timer);
    words.forEach((w) => w.classList.add("on"));
  };
}

/** Deterministic barcode from the clip id, drawn as bars. Purely decorative. */
function barcodeSvg(seed: string): string {
  let bits = "";
  for (let i = 0; bits.length < 96; i++) bits += parseInt(textHash(`${seed}:${i}`), 16).toString(2).padStart(32, "0");
  let x = 0;
  const bars: string[] = [];
  for (let i = 0; i < 48 && x < 236; i++) {
    const w = 1 + Number(bits[i * 2]) + Number(bits[i * 2 + 1]);
    if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="34"/>`);
    x += w + 1;
  }
  return `<svg class="receipt-barcode" viewBox="0 0 ${x} 34" preserveAspectRatio="none" aria-hidden="true">${bars.join("")}</svg>`;
}

/**
 * The receipt: the whole original, never a cropped fragment, with the excerpt
 * highlighted, where it came from, and links to the source and an archive.
 * Styled as thermal paper on purpose, so a screenshot can't pass as the
 * original post.
 */
export function receiptHtml(view: ClipView, step: Step, unreviewed = false): string {
  const clip = view.clip;
  if (clip.kind !== "text") return "";
  const t = view.fullText;
  const kept = contextIntegrity(view, step);
  const from = [clip.speaker, clip.handle].filter(Boolean).join(" ");
  const written = clip.saidOn ?? clip.sourceDate;
  return `<figure class="receipt" aria-label="Receipt for this quote">
    <div class="receipt-head">
      <span class="receipt-brand">See ’n Say Receipts</span>
      <span class="receipt-no">No. ${textHash(clip.id).slice(0, 6).toUpperCase()}</span>
    </div>
    <dl class="receipt-meta">
      <div><dt>Item</dt><dd>${MEDIUM_LABEL[clip.medium]}</dd></div>
      <div><dt>From</dt><dd>${esc(from)}</dd></div>
      <div><dt>Written</dt><dd>${esc(written)}</dd></div>
      <div><dt>Published</dt><dd>${esc(clip.sourceTitle)}, ${esc(clip.sourceDate)}</dd></div>
    </dl>
    <p class="receipt-text">${esc(t.slice(0, step.start))}<mark>${esc(t.slice(step.start, step.end))}</mark>${esc(t.slice(step.end))}</p>
    <dl class="receipt-totals">
      <div><dt>Quoted on the toy</dt><dd>${kept}%</dd></div>
      <div><dt>Context omitted</dt><dd>${100 - kept}%</dd></div>
    </dl>
    ${clip.provenanceNote ? `<p class="receipt-note">${esc(clip.provenanceNote)}</p>` : ""}
    <p class="receipt-links">
      <a href="${esc(clip.sourceUrl)}" target="_blank" rel="noopener">Original</a>
      ${clip.archiveUrl ? `<a href="${esc(clip.archiveUrl)}" target="_blank" rel="noopener">Archived copy</a>` : `<span>Permanent public record</span>`}
    </p>
    ${unreviewed ? `<p class="receipt-stamp">Unreviewed</p>` : ""}
    ${barcodeSvg(clip.id)}
    <p class="receipt-thanks">Thank you for your outrage</p>
  </figure>`;
}
