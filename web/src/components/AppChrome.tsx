"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, ChartNoAxesCombined, Globe, LayoutDashboard, Monitor, Settings2, ShieldCheck, Users } from "lucide-react";

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

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");

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
              {!isAuthRoute && <MobileNavigationMenu mainItems={mobileMainNavigationItems} accountItems={footerLinks} />}
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
                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined}
                    className={`relative flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium no-underline transition-colors hover:no-underline ${isActive
                      ? "border-indigo-600 text-indigo-700 dark:border-indigo-300 dark:text-indigo-200"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"}`}>
                    <item.icon aria-hidden="true" className="size-4" />
                    {item.label}
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
