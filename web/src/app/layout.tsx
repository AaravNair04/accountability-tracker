import type { Metadata } from "next";
import "./globals.css";

import AppChrome from "@/components/AppChrome";
import {
  getNotificationCount
} from "@/lib/notifications";
import {
  createClient
} from "@/lib/supabase/server";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase =
    await createClient();

  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();

  const notificationCount =
    user
      ? await getNotificationCount(
          user.id
        )
      : 0;

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
        <AppChrome notificationCount={notificationCount}>
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
