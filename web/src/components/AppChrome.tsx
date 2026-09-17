"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, ChartNoAxesCombined, Globe, LayoutDashboard, Monitor, Settings2, ShieldCheck, Users } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState
} from "react";

import ThemeToggle from "./ThemeToggle";
import ProfileMenu from "./ProfileMenu";
import MobileNavigationMenu from "./MobileNavigationMenu";
import ToastViewport from "./ToastViewport";

const navigationItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { href: "/peers", label: "Peers", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/devices", label: "Devices", icon: Monitor },
  { href: "/tracked-sites", label: "Tracked Sites", icon: Globe },
  { href: "/settings", label: "Settings", icon: Settings2 }
];

const footerLinks = [
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
  { href: "/faqs", label: "FAQs" }
];

const mobileMainNavigationItems = navigationItems.filter((item) => item.href !== "/settings");

function isActiveRoute(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function formatNotificationCount(
  count: number
) {
  return count > 99
    ? "99+"
    : String(
        count
      );
}

type AppChromeProps = {
  children: React.ReactNode;
  notificationCount: number;
};

export default function AppChrome({
  children,
  notificationCount
}: AppChromeProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const [
    liveNotificationCount,
    setLiveNotificationCount
  ] =
    useState(
      notificationCount
    );
  const hasNotifications =
    liveNotificationCount > 0;

  const fetchNotificationCount =
    useCallback(
      async (
        signal?: AbortSignal
      ) => {
        if (
          isAuthRoute
        ) {
          return 0;
        }

        try {
          const response =
            await fetch(
              "/api/notifications/count",
              {
                cache:
                  "no-store",
                signal
              }
            );

          const data =
            await response.json() as {
              count?: unknown;
            };

          if (
            typeof data.count ===
              "number"
          ) {
            return data.count;
          }
        } catch (error) {
          if (
            error instanceof DOMException &&
            error.name ===
              "AbortError"
          ) {
            return null;
          }

          console.error(
            "Failed to refresh notification count:",
            error
          );
        }

        return null;
      },
      [
        isAuthRoute
      ]
    );

  const refreshNotificationCount =
    useCallback(
      async () => {
        const nextCount =
          await fetchNotificationCount();

        if (
          nextCount !==
          null
        ) {
          setLiveNotificationCount(
            nextCount
          );
        }
      },
      [
        fetchNotificationCount
      ]
    );

  useEffect(
    () => {
      const controller =
        new AbortController();

      async function updateNotificationCount() {
        const nextCount =
          await fetchNotificationCount(
            controller.signal
          );

        if (
          !controller.signal.aborted &&
          nextCount !==
            null
        ) {
          setLiveNotificationCount(
            nextCount
          );
        }
      }

      void updateNotificationCount();

      return () => {
        controller.abort();
      };
    },
    [
      pathname,
      fetchNotificationCount
    ]
  );

  useEffect(
    () => {
      function handleNotificationsChanged() {
        void refreshNotificationCount();
      }

      function handleFocus() {
        void refreshNotificationCount();
      }

      function handleVisibilityChange() {
        if (
          document.visibilityState ===
          "visible"
        ) {
          void refreshNotificationCount();
        }
      }

      window.addEventListener(
        "accountability:notifications-changed",
        handleNotificationsChanged
      );
      window.addEventListener(
        "focus",
        handleFocus
      );
      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      return () => {
        window.removeEventListener(
          "accountability:notifications-changed",
          handleNotificationsChanged
        );
        window.removeEventListener(
          "focus",
          handleFocus
        );
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    },
    [
      refreshNotificationCount
    ]
  );

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only z-50 bg-white p-3 text-indigo-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto grid max-w-6xl gap-x-6 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
          <div className="flex min-h-18 min-w-0 items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-slate-950 no-underline hover:text-indigo-600 hover:no-underline sm:text-base dark:text-white dark:hover:text-indigo-300">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Activity aria-hidden="true" className="size-5" strokeWidth={2.5} />
              </span>
              <span>Accountability <span className="block text-xs font-medium text-slate-500 sm:inline sm:text-base dark:text-slate-400">Tracker</span></span>
            </Link>
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <ThemeToggle />
              {!isAuthRoute && <MobileNavigationMenu mainItems={mobileMainNavigationItems} accountItems={footerLinks} notificationCount={liveNotificationCount} />}
            </div>
          </div>

          <div className="col-start-2 row-start-1 hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            {!isAuthRoute && <ProfileMenu />}
          </div>

          {!isAuthRoute && (
            <nav aria-label="Primary navigation" className="col-span-2 hidden gap-1 border-t border-slate-100 pt-1 lg:flex dark:border-slate-800">
              {navigationItems.map((item) => {
                const isActive = isActiveRoute(pathname, item.href);
                const isNotificationsItem =
                  item.href ===
                  "/notifications";
                const shouldHighlightNotifications =
                  isNotificationsItem &&
                  hasNotifications;

                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}
                    aria-label={shouldHighlightNotifications ? `Notifications, ${liveNotificationCount} unread` : undefined}
                    className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium no-underline transition-colors hover:no-underline ${shouldHighlightNotifications ? "pr-8" : ""} ${isActive
                      ? "border-indigo-600 text-indigo-700 dark:border-indigo-300 dark:text-indigo-200"
                      : shouldHighlightNotifications
                        ? "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/15 dark:hover:text-white"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"}`}>
                    <item.icon aria-hidden="true" className="size-4" />
                    {item.label}
                    {shouldHighlightNotifications && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 flex min-w-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[0.625rem] font-bold leading-5 text-white ring-2 ring-white dark:bg-indigo-300 dark:text-slate-950 dark:ring-slate-950"
                      >
                        {formatNotificationCount(liveNotificationCount)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">{children}</div>

      {!isAuthRoute && (
        <footer className="border-t border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-sm font-bold text-slate-950 dark:text-white">Accountability Tracker</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
                Private by default. Built for accountable focus.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-4 gap-y-2">
                {footerLinks.map((item) => {
                  const isActive = isActiveRoute(pathname, item.href);
                  return (
                    <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}
                      className={`text-sm font-semibold no-underline ${isActive
                        ? "text-indigo-700 dark:text-indigo-200"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"}`}>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <p className="text-xs text-slate-500 dark:text-slate-400">&copy; 2026 Accountability Tracker</p>
            </div>
          </div>
        </footer>
      )}
      <ToastViewport />
    </div>
  );
}
