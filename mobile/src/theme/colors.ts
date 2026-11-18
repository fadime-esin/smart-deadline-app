/**
 * Visual theme "School" (report, Section 5.7): colours, fonts, corner radii.
 *
 *   Light mode = a notebook: cream ruled paper with a red margin line,
 *                index-card surfaces, blue ink, yellow highlighter.
 *   Dark mode  = a chalkboard: green board, chalk-white writing,
 *                yellow chalk for accents, a wooden ledge above the tab bar.
 *
 * The app follows the phone's dark or light mode setting.
 *
 * Accessibility rule: colour is never the only signal. Urgency is always
 * shown with a symbol and a word too (see UrgencyBadge), and every colour
 * pair used for text meets WCAG AA contrast.
 */

import { useColorScheme } from "react-native";

export interface Palette {
  /** Page colour: paper (light) or board (dark). */
  background: string;
  /** Cards and inputs. */
  surface: string;
  /** Rows, chips and other raised parts inside a card. */
  surfaceRaised: string;
  text: string;
  textMuted: string;
  border: string;
  strong: string;
  /** Ink blue (light) / chalk yellow (dark): primary buttons, selected items, progress. */
  primary: string;
  primaryText: string;
  /** Accent used for text and icons on the normal background. */
  accent: string;
  /** Highlighter / soft accent background, e.g. behind icons. */
  accentSoft: string;
  error: string;
  overdue: string;
  critical: string;
  atRisk: string;
  normal: string;
  /** Tasks the user marked as urgent. */
  urgent: string;
  urgentText: string;
  track: string;
  /** Decoration: ruled lines and margin line of the paper (transparent on the board). */
  ruledLine: string;
  marginLine: string;
  /** Decoration: strip of tape on cards, wooden ledge above the tab bar. */
  tape: string;
  ledge: string;
}

export const palettes: Record<"light" | "dark", Palette> = {
  light: {
    background: "#f7f1e1",
    surface: "#fffdf6",
    surfaceRaised: "#f4edd8",
    text: "#1d2740",
    textMuted: "#565c70",
    border: "#b9ac85",
    strong: "#2a3350",
    primary: "#2b4c9b",
    primaryText: "#fffdf6",
    accent: "#24418a",
    accentSoft: "#fbe88a",
    error: "#a11b1b",
    overdue: "#a11b1b",
    critical: "#8a4600",
    atRisk: "#6b5d00",
    normal: "#1d4f8a",
    urgent: "#7d1a6a",
    urgentText: "#fffdf6",
    track: "#e7dfc6",
    ruledLine: "#cfdcec",
    marginLine: "#e9a8a8",
    tape: "rgba(244, 196, 48, 0.55)",
    ledge: "#d6caa8",
  },
  dark: {
    background: "#1c382f",
    surface: "#24463b",
    surfaceRaised: "#2d5346",
    text: "#f3f0e6",
    textMuted: "#bccbc2",
    border: "#7d9c90",
    strong: "#dfe6dc",
    primary: "#f2d36b",
    primaryText: "#1c2a24",
    accent: "#f2d36b",
    accentSoft: "#35594b",
    error: "#ffb4a9",
    overdue: "#ffa69a",
    critical: "#ffc46b",
    atRisk: "#e9df86",
    normal: "#a6d3ff",
    urgent: "#f6b0e6",
    urgentText: "#2a1426",
    track: "#16302a",
    ruledLine: "transparent",
    marginLine: "transparent",
    tape: "rgba(243, 240, 230, 0.28)",
    ledge: "#9a6a3a",
  },
};

export type Scheme = "light" | "dark";

/** The current colour scheme: the phone's dark or light mode. */
export function useScheme(): Scheme {
  return useColorScheme() === "dark" ? "dark" : "light";
}

export function useColors(): Palette {
  return palettes[useScheme()];
}

/**
 * Font family names, loaded in the root layout. On Android every weight is a
 * separate font, so weights are chosen by family, not by fontWeight.
 * `hand` is the handwriting font used for headings (like writing on paper or
 * on the board); body text stays in Inter, which is easier to read when small.
 * The handwriting font has long descenders (g, y, ş, ç): when a lineHeight is
 * set for it, use about 1.4 x the fontSize, or Android cuts the letters off.
 */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  hand: "PatrickHand_400Regular",
} as const;

/** Paper and index cards have small corners. */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/** Distance between the ruled lines of the notebook page. */
export const RULE_SPACING = 30;
