"use client";

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


export default function ThemeToggle() {
  function toggleTheme() {
    const isDark =
      document.documentElement.classList.contains(
        "dark"
      );

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
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      aria-label="Toggle light and dark theme"
    >
      Theme
    </button>
  );
}
