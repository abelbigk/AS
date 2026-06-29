export type ThemeMode = "light" | "dark";

export const themes = {
  light: {
    mode: "light" as const,
    background: "#f5f5f7",
    surface: "rgba(255,255,255,0.92)",
    surfaceBorder: "rgba(0,0,0,0.08)",
    text: "#111111",
    textMuted: "rgba(17,17,17,0.55)",
    primary: "#2563eb",
    danger: "#dc2626",
    success: "#16a34a",
    warning: "#ea580c",
    tabBar: "rgba(255,255,255,0.96)",
    overlay: "rgba(255,255,255,0.88)",
  },
  dark: {
    mode: "dark" as const,
    background: "#0a0a0c",
    surface: "rgba(20,20,24,0.92)",
    surfaceBorder: "rgba(255,255,255,0.1)",
    text: "#f4f4f5",
    textMuted: "rgba(244,244,245,0.55)",
    primary: "#3b82f6",
    danger: "#ef4444",
    success: "#22c55e",
    warning: "#f97316",
    tabBar: "rgba(12,12,16,0.96)",
    overlay: "rgba(10,10,12,0.88)",
  },
};

export type AppTheme = (typeof themes)[ThemeMode];
