import type { IconName } from "../types.ts";

// Stroke icons on a 24×24 grid, drawn like the embossed pictures on the toy.
export const ICONS: Record<IconName, string> = {
  chip: `<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>`,
  skull: `<path d="M12 3a8 8 0 0 0-8 8c0 2.8 1.4 4.6 3 5.6V20h10v-3.4c1.6-1 3-2.8 3-5.6a8 8 0 0 0-8-8z"/><circle cx="9" cy="11.5" r="1.8"/><circle cx="15" cy="11.5" r="1.8"/><path d="M10 20v-2M14 20v-2M12 14.5l-1 2h2z"/>`,
  stopwatch: `<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M12 2.5v3.5M18.5 6.5l1.5-1.5"/>`,
  orb: `<circle cx="12" cy="10" r="7"/><path d="M7 20h10M8.5 17.5 7 20M15.5 17.5 17 20M9 8.5a3.5 3.5 0 0 1 3-2.5"/>`,
  slip: `<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 11h8M8 14.5h8M8 18h5"/>`,
  rocket: `<path d="M12 2.5c3 2.2 4.5 5.5 4.5 9.5v4h-9v-4c0-4 1.5-7.3 4.5-9.5z"/><circle cx="12" cy="9.5" r="1.8"/><path d="M7.5 13 4.5 16v3l3-1.5M16.5 13l3 3v3l-3-1.5M10 19.5l2 2.5 2-2.5"/>`,
  dollar: `<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-1-1.8-1.5-3-1.5-1.8 0-3 .9-3 2.3 0 3.2 6 1.8 6 5 0 1.4-1.3 2.4-3 2.4-1.3 0-2.5-.6-3.2-1.6M12 5v2M12 16.7V19"/>`,
  person: `<circle cx="12" cy="6.5" r="3.2"/><path d="M5.5 21c0-4 2.9-7.5 6.5-7.5s6.5 3.5 6.5 7.5"/><path d="M9.5 16.5v3M11 16.5v3M12.8 16.5v3M14.5 16.5v3"/>`,
  loop: `<path d="M12 12c-2-2.7-3.6-4-5.3-4a4 4 0 0 0 0 8c1.7 0 3.3-1.3 5.3-4zm0 0c2 2.7 3.6 4 5.3 4a4 4 0 0 0 0-8c-1.7 0-3.3 1.3-5.3 4z"/>`,
  chart: `<path d="M3.5 20.5h17M5 16l4.5-4.5 3.5 3 6.5-7.5"/><path d="M15 7h4.5v4.5"/>`,
  eye: `<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="0.8"/>`,
  seedling: `<path d="M12 21v-9M12 12c0-3.5-2.5-6-7-6 0 3.5 2.5 6 7 6zM12 14c0-3 2.2-5.5 6.5-5.5 0 3-2.2 5.5-6.5 5.5z"/><path d="M8 21h8"/>`,
};
