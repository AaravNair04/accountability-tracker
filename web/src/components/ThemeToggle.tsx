"use client";

import { Moon, Sun } from "lucide-react";

import {
  useSyncExternalStore
} from "react";

function applyTheme(
  theme: "dark" | "light"
) {
  const isDark =
    theme ===
    "dark";

  document.documentElement.classList.toggle(
    "dark",
    isDark
  );

  document.documentElement.style.colorScheme =
    isDark
      ? "dark"
      : "light";
}

function getThemeSnapshot() {
  if (
    typeof document ===
    "undefined"
  ) {
    return "light";
  }

  return document.documentElement.classList.contains(
    "dark"
  )
    ? "dark"
    : "light";
}

function subscribeToThemeChanges(
  onStoreChange: () => void
) {
  window.addEventListener(
    "storage",
    onStoreChange
  );

  window.addEventListener(
    "accountability-theme-change",
    onStoreChange
  );

  return () => {
    window.removeEventListener(
      "storage",
      onStoreChange
    );

    window.removeEventListener(
      "accountability-theme-change",
      onStoreChange
    );
  };
}


export default function ThemeToggle() {
  const theme =
    useSyncExternalStore(
      subscribeToThemeChanges,
      getThemeSnapshot,
      () =>
        "light"
    );

  function toggleTheme() {
    const isDark =
      theme ===
      "dark";

    const nextTheme =
      isDark
        ? "light"
        : "dark";

    applyTheme(
      nextTheme
    );

    localStorage.setItem(
      "accountability-theme",
      nextTheme
    );

    window.dispatchEvent(
      new Event(
        "accountability-theme-change"
      )
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={
        theme ===
        "dark"
      }
      className="group inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      aria-label="Toggle light and dark theme"
    >
      <span
        aria-hidden="true"
        className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 transition-colors group-aria-checked:bg-indigo-600 dark:bg-slate-700 dark:group-aria-checked:bg-indigo-500"
      >
        <span
          className="inline-flex h-4 w-4 translate-x-0.5 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm transition-transform group-aria-checked:translate-x-4 group-aria-checked:text-indigo-600"
        >
          {
            theme ===
              "dark"
              ? (
                <Moon className="h-3 w-3" />
              )
              : (
                <Sun className="h-3 w-3" />
              )
          }
        </span>
      </span>

      <span className="hidden sm:inline">
        {
          theme ===
            "dark"
            ? "Dark"
            : "Light"
        }
      </span>
    </button>
  );
}
