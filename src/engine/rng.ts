export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function weightedPick<T>(items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= Math.max(0, weight(item));
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
