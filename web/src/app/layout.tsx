import type { Metadata } from "next";
import "./globals.css";

import AppChrome from "@/components/AppChrome";

export const metadata: Metadata = {
  title: "Accountability Tracker",
  description: "Track and review your digital usage",
};

const themeScript = `
  (function () {
    try {
      var storedTheme = localStorage.getItem("accountability-theme");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;
      document.documentElement.classList.toggle("dark", shouldUseDark);
      document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
    } catch (_) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              themeScript
          }}
        />
      </head>
      <body>
        <AppChrome>
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
