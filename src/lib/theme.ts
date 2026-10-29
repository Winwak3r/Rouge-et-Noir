// Thème du site : CLAIR par défaut, sombre au choix du joueur (cookie « theme », propre à l'appareil, un an).
export type Theme = "dark" | "light";
export const THEME_COOKIE = "theme";
export const parseTheme = (v: unknown): Theme => (v === "dark" ? "dark" : "light");
