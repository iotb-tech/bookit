"use client";

import { useEffect } from "react";

function applySavedTheme() {
  const saved = window.localStorage.getItem("bookit-theme");
  const theme =
    saved === "light" || saved === "dark" || saved === "system"
      ? saved
      : "system";

  const systemDark = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  const useDark =
    theme === "dark" || (theme === "system" && systemDark);

  document.documentElement.classList.toggle("dark", useDark);
  document.documentElement.dataset.theme = theme;
}

export default function ThemeInitializer() {
  useEffect(() => {
    applySavedTheme();

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      const saved = window.localStorage.getItem("bookit-theme") ?? "system";
      if (saved === "system") applySavedTheme();
    };

    media.addEventListener("change", handleSystemThemeChange);

    return () => {
      media.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  return null;
}
