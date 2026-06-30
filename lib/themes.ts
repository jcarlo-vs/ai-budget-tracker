// Static theme catalog for the /themes gallery. The user picks ONE; Task 12
// copies that theme's `tokens` (and `surfaceCss`/`fontStack`) into globals.css
// to build the whole app in that look.

export type ThemeDef = {
  id: string;
  name: string;
  blurb: string;
  /** All semantic CSS variables. `--background` may be a gradient. */
  tokens: Record<string, string>;
  /** Extra CSS folded into the `.surface` rule (glass blur, neumorphic shadows, etc.). */
  surfaceCss?: string;
  /** Font family that defines the theme, if any. */
  fontStack?: string;
};

export const THEMES: ThemeDef[] = [
  {
    id: "minimal-mono",
    name: "Minimal Mono",
    blurb: "White space, one ink accent.",
    tokens: {
      "--background": "#ffffff", "--foreground": "#0a0a0a",
      "--card": "#ffffff", "--card-foreground": "#0a0a0a",
      "--muted": "#f4f4f5", "--muted-foreground": "#71717a",
      "--accent": "#18181b", "--accent-foreground": "#ffffff",
      "--border": "#e4e4e7", "--danger": "#dc2626", "--radius": "0.75rem",
    },
  },
  {
    id: "dark-glass",
    name: "Dark Glass",
    blurb: "Frosted cards, neon cyan.",
    tokens: {
      "--background": "#0b1020", "--foreground": "#e8ecf5",
      "--card": "rgba(255,255,255,0.06)", "--card-foreground": "#e8ecf5",
      "--muted": "rgba(255,255,255,0.10)", "--muted-foreground": "#9aa3b8",
      "--accent": "#22d3ee", "--accent-foreground": "#04121a",
      "--border": "rgba(255,255,255,0.14)", "--danger": "#fb7185", "--radius": "1.25rem",
    },
    surfaceCss: "backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);",
  },
  {
    id: "neumorphic-soft",
    name: "Neumorphic Soft",
    blurb: "Extruded pastel surfaces.",
    tokens: {
      "--background": "#e6e7ee", "--foreground": "#44476a",
      "--card": "#e6e7ee", "--card-foreground": "#44476a",
      "--muted": "#dcdde6", "--muted-foreground": "#8c8fae",
      "--accent": "#6d5dfc", "--accent-foreground": "#ffffff",
      "--border": "#d1d2dc", "--danger": "#e5567a", "--radius": "1.5rem",
    },
    surfaceCss: "border:none;box-shadow:6px 6px 12px #c5c6d0,-6px -6px 12px #ffffff;",
  },
  {
    id: "ios-native",
    name: "iOS Native",
    blurb: "Wallet / Settings, system blue.",
    tokens: {
      "--background": "#f2f2f7", "--foreground": "#000000",
      "--card": "#ffffff", "--card-foreground": "#000000",
      "--muted": "#e5e5ea", "--muted-foreground": "#8e8e93",
      "--accent": "#007aff", "--accent-foreground": "#ffffff",
      "--border": "#d1d1d6", "--danger": "#ff3b30", "--radius": "0.875rem",
    },
    fontStack: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
  },
  {
    id: "playful-candy",
    name: "Playful Candy",
    blurb: "Bubbly pink, big rounding.",
    tokens: {
      "--background": "#fff7fb", "--foreground": "#2d1b3d",
      "--card": "#ffffff", "--card-foreground": "#2d1b3d",
      "--muted": "#ffe4f1", "--muted-foreground": "#9b6a8a",
      "--accent": "#ff4d8d", "--accent-foreground": "#ffffff",
      "--border": "#ffd6ea", "--danger": "#ff3b30", "--radius": "1.75rem",
    },
  },
  {
    id: "brutalist",
    name: "Brutalist",
    blurb: "Hard borders, mono, yellow.",
    tokens: {
      "--background": "#fafaf0", "--foreground": "#000000",
      "--card": "#ffffff", "--card-foreground": "#000000",
      "--muted": "#ededed", "--muted-foreground": "#444444",
      "--accent": "#ffe600", "--accent-foreground": "#000000",
      "--border": "#000000", "--danger": "#ff0000", "--radius": "0rem",
    },
    surfaceCss: "box-shadow:4px 4px 0 #000;",
    fontStack: "'Courier New', ui-monospace, monospace",
  },
  {
    id: "warm-earthy",
    name: "Warm Earthy",
    blurb: "Terracotta, sage, serif.",
    tokens: {
      "--background": "#f3ece2", "--foreground": "#3a322b",
      "--card": "#fbf7f0", "--card-foreground": "#3a322b",
      "--muted": "#e8ddcd", "--muted-foreground": "#8a7d6b",
      "--accent": "#c1654a", "--accent-foreground": "#fff8f0",
      "--border": "#ddceb8", "--danger": "#b54a3a", "--radius": "1rem",
    },
    fontStack: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "fintech-pro",
    name: "Fintech Pro",
    blurb: "Dark navy, mint-green data.",
    tokens: {
      "--background": "#0d1b2a", "--foreground": "#e0e6ed",
      "--card": "#16263a", "--card-foreground": "#e0e6ed",
      "--muted": "#1e3349", "--muted-foreground": "#8a9bb0",
      "--accent": "#2ee6a8", "--accent-foreground": "#04231a",
      "--border": "#243a52", "--danger": "#ff5c5c", "--radius": "0.75rem",
    },
  },
  {
    id: "aurora-gradient",
    name: "Aurora Gradient",
    blurb: "Northern-lights canvas, glass.",
    tokens: {
      "--background": "linear-gradient(160deg,#1e1b4b 0%,#312e81 45%,#0e7490 100%)",
      "--foreground": "#f5f3ff",
      "--card": "rgba(255,255,255,0.10)", "--card-foreground": "#f5f3ff",
      "--muted": "rgba(255,255,255,0.16)", "--muted-foreground": "#c7d2fe",
      "--accent": "#a78bfa", "--accent-foreground": "#1e1b4b",
      "--border": "rgba(255,255,255,0.20)", "--danger": "#fb7185", "--radius": "1.5rem",
    },
    surfaceCss: "backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);",
  },
  {
    id: "retro-terminal",
    name: "Retro Terminal",
    blurb: "Phosphor green, amber, mono.",
    tokens: {
      "--background": "#0a0e0a", "--foreground": "#33ff66",
      "--card": "#0f160f", "--card-foreground": "#33ff66",
      "--muted": "#14241a", "--muted-foreground": "#2a9d4f",
      "--accent": "#ffb000", "--accent-foreground": "#0a0e0a",
      "--border": "#1f3a26", "--danger": "#ff5555", "--radius": "0.25rem",
    },
    surfaceCss: "box-shadow:0 0 12px rgba(51,255,102,0.12);",
    fontStack: "'Courier New', ui-monospace, monospace",
  },
];
