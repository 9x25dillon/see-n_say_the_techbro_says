import type { Category, CategoryId } from "../types.ts";

// Twelve slices, like the original toy. Order is clockwise from 12 o'clock.
export const CATEGORIES: Category[] = [
  { id: "ai", label: "AI", wheel: ["AI"], icon: "chip" },
  { id: "agi-doom", label: "AGI Doom", wheel: ["AGI", "DOOM"], icon: "skull" },
  { id: "efficiency", label: "Efficiency", wheel: ["EFFICIENCY"], icon: "stopwatch" },
  { id: "future", label: "The Future", wheel: ["THE", "FUTURE"], icon: "orb" },
  { id: "layoffs", label: "Layoffs", wheel: ["LAYOFFS"], icon: "slip" },
  { id: "mars", label: "Mars", wheel: ["MARS"], icon: "rocket" },
  { id: "monetization", label: "Monetization", wheel: ["MONETI-", "ZATION"], icon: "dollar" },
  { id: "humanity", label: "Humanity", wheel: ["HUMANITY"], icon: "person" },
  { id: "algorithm", label: "The Algorithm", wheel: ["THE", "ALGORITHM"], icon: "loop" },
  { id: "shareholder-value", label: "Shareholder Value", wheel: ["SHARE-", "HOLDER", "VALUE"], icon: "chart" },
  { id: "surveillance", label: "Surveillance", wheel: ["SURVEIL-", "LANCE"], icon: "eye" },
  { id: "still-early", label: "We're Still Early", wheel: ["WE'RE", "STILL", "EARLY"], icon: "seedling" },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function categoryById(id: CategoryId): Category {
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}
