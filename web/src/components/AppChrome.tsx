"use client";

import Link from "next/link";
import {
  usePathname
} from "next/navigation";

import ThemeToggle from "./ThemeToggle";
import ProfileMenu from "./ProfileMenu";
import MoreMenu from "./MoreMenu";
import ToastViewport from "./ToastViewport";


const navigationItems = [
  {
    href:
      "/",
    label:
      "Dashboard"
  },
  {
    href:
      "/reports",
    label:
      "Reports"
  },
  {
    href:
      "/peers",
    label:
      "Peers"
  },
  {
    href:
      "/notifications",
    label:
      "Notifications"
  },
  {
    href:
      "/devices",
    label:
      "Devices"
  },
  {
    href:
      "/tracked-sites",
    label:
      "Tracked Sites"
  },
  {
    href:
      "/settings",
    label:
      "Settings"
  }
];

const mobilePrimaryNavigationItems =
  navigationItems.slice(
    0,
    3
  );

const mobileMoreNavigationItems =
  navigationItems.slice(
    3
  );


function isActiveRoute(
  pathname: string,
  href: string
) {
  if (
    href ===
    "/"
  ) {
    return pathname ===
      "/";
  }

  return pathname ===
    href ||
    pathname.startsWith(
      `${href}/`
    );
}


export default function AppChrome({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();

  const isAuthRoute =
    pathname.startsWith(
      "/auth"
    );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="text-base font-bold tracking-normal text-slate-950 no-underline hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300"
            >
              Accountability Tracker
            </Link>

            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle />

              {
                !isAuthRoute && (
                  <ProfileMenu />
                )
              }
            </div>
          </div>

          {
            !isAuthRoute && (
              <>
                <nav
                  aria-label="Primary navigation"
                  className="flex items-center gap-1 lg:hidden"
                >
                  {
                    mobilePrimaryNavigationItems.map(
                      (item) => {
                        const isActive =
                          isActiveRoute(
                            pathname,
                            item.href
                          );

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={
                              isActive
                                ? "page"
                                : undefined
                            }
                            className={
                              [
                                "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold no-underline transition-colors",
                                isActive
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                              ].join(
                                " "
                              )
                            }
                          >
                            {item.label}
                          </Link>
                        );
                      }
                    )
                  }

                  <MoreMenu
                    items={
                      mobileMoreNavigationItems
                    }
                  />
                </nav>

                <nav
                  aria-label="Primary navigation"
                  className="hidden gap-1 lg:flex"
                >
                  {
                    navigationItems.map(
                      (item) => {
                        const isActive =
                          isActiveRoute(
                            pathname,
                            item.href
                          );

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={
                              isActive
                                ? "page"
                                : undefined
                            }
                            className={
                              [
                                "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold no-underline transition-colors",
                                isActive
                                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                              ].join(
                                " "
                              )
                            }
                          >
                            {item.label}
                          </Link>
                        );
                      }
                    )
                  }
                </nav>
              </>
            )
          }

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />

            {
              !isAuthRoute && (
                <ProfileMenu />
              )
            }
          </div>
        </div>
      </header>

      {children}

      <ToastViewport />
    </div>
  );
}
