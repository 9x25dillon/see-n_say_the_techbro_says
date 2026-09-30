// Every toy noise is synthesized, so the app ships with zero sound assets.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;

/** Lazily creates the audio graph. Call from a user gesture the first time. */
export function audioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function output(): AudioNode {
  audioContext();
  return master!;
}

export function setMuted(value: boolean) {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function envelope(ac: AudioContext, peak: number, attack: number, decay: number, at = ac.currentTime) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  g.connect(output());
  return g;
}

function noiseSource(ac: AudioContext, at: number, duration: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.start(at, Math.random() * 1.5, duration);
  return src;
}

/** Ratchet tick: the lever's teeth and the pointer passing a slice. */
export function tick(strength = 1) {
  const ac = audioContext();
  const t = ac.currentTime;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2200 + Math.random() * 600;
  bp.Q.value = 3;
  bp.connect(envelope(ac, 0.5 * strength, 0.002, 0.03, t));
  noiseSource(ac, t, 0.04).connect(bp);
}

/** The pull-string zip as the lever snaps home. */
export function zip() {
  const ac = audioContext();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(760, t + 0.32);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  osc.connect(lp).connect(envelope(ac, 0.18, 0.01, 0.34, t));
  osc.start(t);
  osc.stop(t + 0.4);
}

/** A needle dragged across the record, right before the quote lands. */
export function scratch() {
  const ac = audioContext();
  const t = ac.currentTime;
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 6;
  bp.frequency.setValueAtTime(2800, t);
  bp.frequency.exponentialRampToValueAtTime(500, t + 0.18);
  bp.frequency.exponentialRampToValueAtTime(2400, t + 0.42);
  bp.connect(envelope(ac, 0.9, 0.01, 0.45, t));
  noiseSource(ac, t, 0.5).connect(bp);
}

export function ding() {
  const ac = audioContext();
  const t = ac.currentTime;
  for (const [freq, delay] of [[880, 0], [1320, 0.09]] as const) {
    const osc = ac.createOscillator();
    osc.frequency.value = freq;
    osc.connect(envelope(ac, 0.3, 0.005, 0.8, t + delay));
    osc.start(t + delay);
    osc.stop(t + delay + 0.9);
  }
}

export function buzz() {
  const ac = audioContext();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.value = 98;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  osc.connect(lp).connect(envelope(ac, 0.25, 0.01, 0.45, t));
  osc.start(t);
  osc.stop(t + 0.5);
}

/** Rubber-stamp thunk for the CONTEXT INTEGRITY readout. */
export function thunk() {
  const ac = audioContext();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.18);
  osc.connect(envelope(ac, 0.7, 0.004, 0.22, t));
  osc.start(t);
  osc.stop(t + 0.3);
}

/** Conference-call double beep for After Dark. */
export function callBeep() {
  const ac = audioContext();
  const t = ac.currentTime;
  for (const delay of [0, 0.18]) {
    const osc = ac.createOscillator();
    osc.frequency.value = 1046;
    osc.connect(envelope(ac, 0.15, 0.005, 0.1, t + delay));
    osc.start(t + delay);
    osc.stop(t + delay + 0.15);
  }
}

/** Old-phonograph crackle under the voice. Returns a stop function. */
export function crackle(): () => void {
  const ac = audioContext();
  let stopped = false;
  const hiss = ac.createBufferSource();
  hiss.buffer = noiseBuffer(ac);
  hiss.loop = true;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3500;
  const hissGain = ac.createGain();
  hissGain.gain.value = 0.012;
  hiss.connect(hp).connect(hissGain).connect(output());
  hiss.start();

  const pop = () => {
    if (stopped) return;
    const t = ac.currentTime;
    const src = noiseSource(ac, t, 0.006);
    const bp = ac.createBiquadFilter();
    bp.type = "highpass";
    bp.frequency.value = 1500;
    src.connect(bp).connect(envelope(ac, 0.05 + Math.random() * 0.12, 0.001, 0.006, t));
    setTimeout(pop, 30 + Math.random() * 220);
  };
  pop();
  return () => {
    if (stopped) return;
    stopped = true;
    hissGain.gain.setTargetAtTime(0, ac.currentTime, 0.05);
    hiss.stop(ac.currentTime + 0.3);
  };
}
