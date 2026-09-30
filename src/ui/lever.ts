import { tick, zip } from "../audio/sfx.ts";

// The PULL TO DISRUPT lever. Drag it down past the catch, or click it, or
// focus it and press Space/Enter. It springs back and fires onPull.

const CATCH = 0.55; // fraction of travel that counts as a pull
const TOOTH_PX = 14; // ratchet spacing

export interface Lever {
  root: HTMLElement;
  /** Animate a full pull, as if a hand did it. */
  pull(): void;
  setDisabled(disabled: boolean): void;
}

export function createLever(onPull: () => void): Lever {
  const root = document.createElement("div");
  root.className = "lever";
  root.innerHTML = `
    <div class="lever-slot" aria-hidden="true"></div>
    <button type="button" class="lever-handle" id="lever-handle" aria-label="Pull to disrupt">
      <span class="lever-knob"></span>
    </button>
    <span class="lever-label" aria-hidden="true">PULL TO DISRUPT</span>`;
  const handle = root.querySelector<HTMLButtonElement>(".lever-handle")!;
  const slot = root.querySelector<HTMLElement>(".lever-slot")!;

  let dragging = false;
  let startY = 0;
  let offset = 0;
  let lastTooth = 0;
  let disabled = false;
  let moved = false;

  const travel = () => Math.max(60, slot.clientHeight - handle.offsetHeight);
  const place = (px: number, animate: boolean) => {
    handle.classList.toggle("is-springing", animate);
    handle.style.transform = `translateY(${px}px)`;
    root.style.setProperty("--pull", String(px / travel()));
  };

  const release = (fire: boolean) => {
    place(0, true);
    if (fire) {
      zip();
      onPull();
    }
  };

  handle.addEventListener("pointerdown", (e) => {
    if (disabled) return;
    dragging = true;
    moved = false;
    startY = e.clientY;
    offset = 0;
    lastTooth = 0;
    handle.setPointerCapture(e.pointerId);
    place(0, false);
  });

  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    offset = Math.min(travel(), Math.max(0, e.clientY - startY));
    if (offset > 4) moved = true;
    const tooth = Math.floor(offset / TOOTH_PX);
    if (tooth !== lastTooth) {
      lastTooth = tooth;
      tick(0.5);
    }
    place(offset, false);
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    // A tap without a drag counts as a pull; a half-hearted drag does not.
    release(!moved || offset >= travel() * CATCH);
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", () => {
    dragging = false;
    place(0, true);
  });

  handle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      api.pull();
    }
  });
  // Keyboard "click" events are handled above; ignore the synthetic click.
  handle.addEventListener("click", (e) => e.preventDefault());

  const api: Lever = {
    root,
    pull() {
      if (disabled || dragging) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      place(travel(), !reduced);
      for (let i = 1; i <= 4; i++) setTimeout(() => tick(0.5), i * 45);
      setTimeout(() => release(true), reduced ? 60 : 220);
    },
    setDisabled(value) {
      disabled = value;
      root.classList.toggle("is-disabled", value);
    },
  };
  return api;
}
