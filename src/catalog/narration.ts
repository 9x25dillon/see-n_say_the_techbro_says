// Words the toy itself says. Shared by the app and the voice render script.

/** Shown on screen while the narrator talks. */
export const NARRATOR_LINE = "The tech bro say…";
/** What the narrator voice actually speaks. */
export const NARRATOR_SPEECH = "The tech bro say";

export function operatorIntro(analyst: { name: string; firm: string }): string {
  // "Fiduciary Bros." already ends the sentence.
  const stop = analyst.firm.endsWith(".") ? "" : ".";
  return `Our next question comes from the line of ${analyst.name} with ${analyst.firm}${stop} Your line is open.`;
}

export function operatorExcerpt(sourceTitle: string): string {
  return `Our next excerpt comes from ${sourceTitle}.`;
}
