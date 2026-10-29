type IconProps = { name: string; className?: string };

const PATHS: Record<string, string> = {
  overview:
    "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 2h6v2h-6v-2zm0 4h6v2h-6v-2z",
  zones: "M4 6h16v3H4V6zm0 5h10v3H4v-3zm0 5h16v3H4v-3z",
  map: "M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6zm5 0v12m6-10v12",
  monsters: "M12 3l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4l2-4z",
  items: "M5 7l7-3 7 3v10l-7 3-7-3V7zm7-1v14",
  loot: "M6 8h12v10H6V8zm2-3h8l1 3H7l1-3z",
  characters: "M12 4a3 3 0 110 6 3 3 0 010-6zM6 18c1-3 3.2-4.5 6-4.5S17 15 18 18",
  economy: "M5 16V8m4 8V5m4 11V9m4 7v-4",
  season: "M12 4a8 8 0 100 16 8 8 0 000-16zm0 3v5l3 2",
  engagement: "M5 16l4-5 3 3 7-8",
  simulate: "M5 17l4-6 3 3 3-5 4 8",
  hud: "M4 6h16v12H4V6zm2 3h5v2H6V9zm8 0h4v6h-4V9z",
  settings:
    "M12 9a3 3 0 100 6 3 3 0 000-6zM12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4M3 12h2M19 12h2",
  logs: "M6 5h12v14H6V5zm2 3h8M8 12h8M8 15h5",
  admins: "M12 3l7 3v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6l7-3z",
  backup: "M12 5v8m0 0l3-3m-3 3l-3-3M6 17h12",
  chevron: "M8 10l4 4 4-4",
  menu: "M5 7h14M5 12h14M5 17h14",
  collapse: "M9 6l-4 6 4 6M15 6l4 6-4 6",
  navigate: "M4 12h16M14 6l6 6-6 6",
  select: "M5 4l7 16 2-7 7-2L5 4z",
  place: "M12 4v8m0 0l-3-3m3 3l3-3M6 20h12",
  trash: "M5 7h14M9 7V5h6v2m-7 0l1 13h8l1-13",
  camera: "M4 8h3l2-2h6l2 2h3v10H4V8zM12 10a3 3 0 100 6 3 3 0 000-6z",
  bake: "M5 19V9l7-4 7 4v10H5z",
  move: "M12 3v18M12 3l-3 3m3-3l3 3M3 12h18M3 12l3-3m-3 3l3 3",
  rotate: "M20 12a8 8 0 11-2.2-5.5M20 4v4h-4",
  scale: "M4 20L20 4M15 4h5v5M4 15v5h5",
  duplicate: "M8 8h11v11H8V8zM5 16V5h11",
  undo: "M8 8H4v4M5 12a7 7 0 107-7",
  redo: "M16 8h4v4M19 12a7 7 0 11-7-7",
  grid: "M4 4h16v16H4V4zm0 8h16M12 4v16",
  snap: "M4 16l6-6 3 3 7-8",
  focus: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  eye: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeOff: "M3 3l18 18M10 6.2A11 11 0 0112 6c6 0 10 6 10 6a18 18 0 01-4 4.2M6.1 6.1C3.5 8 2 12 2 12s4 6 10 6a10 10 0 004.2-.8",
  lock: "M7 11V8a5 5 0 0110 0v3M6 11h12v9H6v-9z",
  unlock: "M8 11V8a4 4 0 018 0M6 11h12v9H6v-9z",
};

export function StudioIcon({ name, className }: IconProps) {
  const d = PATHS[name] || PATHS.overview;
  return (
    <svg className={className ? `studio-3-icon ${className}` : "studio-3-icon"} viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
