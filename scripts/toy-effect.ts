// The worn-out pull-string toy sound, as an ffmpeg audio filter chain:
// record wow and flutter, a ring-mod buzz, bit-crush, and a tiny plastic speaker.
// Shared by render-narrator.ts (eSpeak) and render-voices.ts (ElevenLabs).

export function toyChain({ pad }: { pad: boolean }): string {
  return [
    // A short lead-in and tail for standalone lines. Aligned takes skip it so
    // their character timings stay put.
    ...(pad ? ["adelay=90", "apad=pad_dur=0.25"] : []),
    "vibrato=f=0.9:d=0.18",
    "vibrato=f=6.5:d=0.22",
    "aeval='val(0)*(0.5+0.5*sin(2*PI*62*t))':c=same",
    "acrusher=bits=7:samples=3:mix=0.55:mode=log:aa=1",
    "highpass=f=380",
    "lowpass=f=3100",
    "aecho=0.8:0.55:6|11:0.35|0.22",
    "loudnorm=I=-15:TP=-1.5:LRA=7",
  ].join(",");
}
