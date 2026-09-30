import type { CategoryId } from "../types.ts";
import { CATEGORIES } from "../catalog/categories.ts";
import { ICONS } from "./icons.ts";
import { tick } from "../audio/sfx.ts";

// The dial: twelve fixed slices, a speaker grille, and a red plastic pointer
// that spins. The slices never rotate, so every label stays upright.

const NS = "http://www.w3.org/2000/svg";
const R_OUT = 232;
const R_IN = 110;
const SLICE = 360 / CATEGORIES.length;

function polar(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [r * Math.sin(rad), -r * Math.cos(rad)];
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function slicePath(i: number): string {
  const a0 = i * SLICE - SLICE / 2;
  const a1 = a0 + SLICE;
  const [ox0, oy0] = polar(R_OUT, a0);
  const [ox1, oy1] = polar(R_OUT, a1);
  const [ix1, iy1] = polar(R_IN, a1);
  const [ix0, iy0] = polar(R_IN, a0);
  return `M${ox0},${oy0} A${R_OUT},${R_OUT} 0 0 1 ${ox1},${oy1} L${ix1},${iy1} A${R_IN},${R_IN} 0 0 0 ${ix0},${iy0} Z`;
}

export interface Wheel {
  svg: SVGSVGElement;
  setAvailable(ids: Set<CategoryId>): void;
  setAimed(id: CategoryId | undefined): void;
  setLanded(id: CategoryId | undefined): void;
  spinTo(id: CategoryId, turns?: number): Promise<void>;
  fitLabels(): void;
}

export function createWheel(onAim: (id: CategoryId) => void): Wheel {
  const svg = el("svg", { viewBox: "-250 -250 500 500", class: "wheel", role: "group", "aria-label": "Category dial" });

  const defs = el("defs");
  defs.innerHTML = `
    <radialGradient id="chrome" cx="35%" cy="30%" r="80%">
      <stop offset="0" style="stop-color:var(--chrome-hi)"/>
      <stop offset="0.45" style="stop-color:var(--chrome-mid)"/>
      <stop offset="0.7" style="stop-color:var(--chrome-hi)"/>
      <stop offset="1" style="stop-color:var(--chrome-lo)"/>
    </radialGradient>
    <linearGradient id="arrow" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" style="stop-color:var(--lever-shade)"/>
      <stop offset="0.45" style="stop-color:var(--lever)"/>
      <stop offset="1" style="stop-color:var(--lever-shade)"/>
    </linearGradient>
    <filter id="lift" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity="0.35"/>
    </filter>`;
  svg.append(defs);

  svg.append(el("circle", { r: 246, class: "wheel-rim" }));
  svg.append(el("circle", { r: 238, class: "wheel-rim-inner" }));

  const slices = new Map<CategoryId, SVGGElement>();
  CATEGORIES.forEach((cat, i) => {
    const g = el("g", {
      class: `slice slice-${(i % 4) + 1}`,
      role: "button",
      tabindex: 0,
      "aria-label": `Aim at ${cat.label}`,
      "data-id": cat.id,
    });
    g.append(el("path", { d: slicePath(i), class: "slice-face" }));

    const [ix, iy] = polar(200, i * SLICE);
    const icon = el("g", { class: "slice-icon", transform: `translate(${ix - 17},${iy - 17}) scale(1.42)` });
    icon.innerHTML = ICONS[cat.icon];
    g.append(icon);

    // Labels stay upright and stack vertically around the slice's centre, so
    // they read top-to-bottom on every side of the dial.
    const lineH = 13.5;
    const [cx, cy] = polar(146, i * SLICE);
    cat.wheel.forEach((text, li) => {
      const y = cy + (li - (cat.wheel.length - 1) / 2) * lineH + 4.5;
      const t = el("text", { x: cx, y, class: "slice-label", "data-max": 66 });
      t.textContent = text;
      g.append(t);
    });

    const aim = () => onAim(cat.id);
    g.addEventListener("click", aim);
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        aim();
      }
    });
    slices.set(cat.id, g);
    svg.append(g);
  });

  // Molded ridges between slices.
  CATEGORIES.forEach((_, i) => {
    const a = i * SLICE - SLICE / 2;
    const [x0, y0] = polar(R_IN, a);
    const [x1, y1] = polar(R_OUT, a);
    svg.append(el("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: "slice-ridge" }));
  });

  // Hub with speaker grille.
  svg.append(el("circle", { r: 104, fill: "url(#chrome)", class: "hub" }));
  const grille = el("g", { class: "grille" });
  for (const [r, n] of [[28, 10], [46, 16], [64, 22], [82, 28]] as const) {
    for (let k = 0; k < n; k++) {
      const [x, y] = polar(r, (360 / n) * k + (r % 2) * 7);
      grille.append(el("circle", { cx: x, cy: y, r: 3.4 }));
    }
  }
  svg.append(grille);

  const pointer = el("g", { class: "pointer", filter: "url(#lift)" });
  pointer.append(el("path", {
    d: "M0,-128 L22,-86 L10,-86 L10,28 Q10,42 0,42 Q-10,42 -10,28 L-10,-86 L-22,-86 Z",
    fill: "url(#arrow)",
    class: "pointer-arrow",
  }));
  pointer.append(el("circle", { r: 26, fill: "url(#chrome)", class: "pointer-cap" }));
  pointer.append(el("circle", { r: 9, class: "pointer-gem" }));
  svg.append(pointer);

  let angle = 0;
  let spinId = 0;
  const setAngle = (deg: number) => {
    angle = deg;
    pointer.setAttribute("transform", `rotate(${deg})`);
  };
  setAngle(-SLICE * 0.5 + 3);

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    svg,
    setAvailable(ids) {
      for (const [id, g] of slices) {
        const off = !ids.has(id);
        g.classList.toggle("is-empty", off);
        g.setAttribute("aria-disabled", String(off));
      }
    },
    setAimed(id) {
      for (const [sid, g] of slices) g.classList.toggle("is-aimed", sid === id);
    },
    setLanded(id) {
      for (const [sid, g] of slices) g.classList.toggle("is-landed", sid === id);
    },
    spinTo(id, turns = 2) {
      const index = CATEGORIES.findIndex((c) => c.id === id);
      const target = index * SLICE + (Math.random() - 0.5) * SLICE * 0.5;
      const from = angle;
      const base = from - (((from % 360) + 360) % 360);
      let to = base + target + 360 * (reducedMotion() ? 0 : turns);
      if (to <= from + 20) to += 360;
      const duration = reducedMotion() ? 250 : 1300 + turns * 250;
      const token = ++spinId;
      return new Promise((resolve) => {
        const start = performance.now();
        let lastSlot = Math.floor((from + SLICE / 2) / SLICE);
        const frame = (now: number) => {
          if (token !== spinId) return resolve(); // a newer spin took over
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 4);
          const deg = from + (to - from) * eased;
          setAngle(deg);
          const slot = Math.floor((deg + SLICE / 2) / SLICE);
          if (slot !== lastSlot) {
            lastSlot = slot;
            tick(0.35 + 0.65 * (1 - p));
          }
          if (p < 1) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
    },
    fitLabels() {
      svg.querySelectorAll<SVGTextElement>(".slice-label").forEach((t) => {
        t.removeAttribute("textLength");
        const max = Number(t.dataset.max);
        if (t.getComputedTextLength() > max) {
          t.setAttribute("textLength", String(max));
          t.setAttribute("lengthAdjust", "spacingAndGlyphs");
        }
      });
    },
  };
}
