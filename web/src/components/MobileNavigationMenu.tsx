"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import {
  usePathname,
  useRouter
} from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState
} from "react";

import {
  createClient
} from "@/lib/supabase/client";
import {
  showToast
} from "./ToastViewport";

type MobileNavigationItem = {
  href: string;
  label: string;
};

type MobileNavigationMenuProps = {
  mainItems: MobileNavigationItem[];
  accountItems: MobileNavigationItem[];
  notificationCount: number;
};

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

export default function MobileNavigationMenu({
  mainItems,
  accountItems,
  notificationCount
}: MobileNavigationMenuProps) {
  const [open, setOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [email, setEmail] =
    useState<string | null>(
      null
    );

  const menuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const menuId =
    useId();

  const pathname =
    usePathname();

  const router =
    useRouter();

  const hasNotifications =
    notificationCount > 0;

  const notificationBadgeLabel =
    notificationCount > 99
      ? "99+"
      : String(
          notificationCount
        );

  useEffect(
    () => {
      const supabase =
        createClient();

      supabase.auth.getUser()
        .then(
          ({
            data
          }) => {
            setEmail(
              data.user?.email ??
              null
            );
          }
        )
        .catch(
          () => {
            setEmail(
              null
            );
          }
        );
    },
    []
  );

  useEffect(
    () => {
      function handlePointerDown(
        event: PointerEvent
      ) {
        if (
          menuRef.current &&
          !menuRef.current.contains(
            event.target as Node
          )
        ) {
          setOpen(
            false
          );
        }
      }

      function handleKeyDown(
        event: KeyboardEvent
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setOpen(
            false
          );
        }
      }

      document.addEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.removeEventListener(
          "pointerdown",
          handlePointerDown
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    []
  );

  async function handleLogout() {
    setLoggingOut(
      true
    );

    const supabase =
      createClient();

    const {
      error
    } =
      await supabase.auth.signOut();

    if (
      error
    ) {
      setLoggingOut(
        false
      );

      showToast(
        error.message,
        "error"
      );

      return;
    }

    setOpen(
      false
    );

    router.replace(
      "/auth"
    );

    router.refresh();
  }

  function renderLinks(
    items: MobileNavigationItem[]
  ) {
    return items.map(
      (item) => {
        const isActive =
          isActiveRoute(
            pathname,
            item.href
          );
        const isNotificationsItem =
          item.href ===
          "/notifications";
        const shouldShowNotificationBadge =
          isNotificationsItem &&
          hasNotifications;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              isActive
                ? "page"
                : undefined
            }
            aria-label={
              shouldShowNotificationBadge
                ? `Notifications, ${notificationCount} unread`
                : undefined
            }
            onClick={
              () =>
                setOpen(
                  false
                )
            }
            className={
              [
                "relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold no-underline transition-colors",
                shouldShowNotificationBadge
                  ? "pr-10"
                  : "",
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                  : shouldShowNotificationBadge
                    ? "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/15 dark:hover:text-white"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
              ].join(
                " "
              )
            }
          >
            {item.label}
            {
              shouldShowNotificationBadge && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-1 flex min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[0.625rem] font-bold leading-5 text-white ring-2 ring-white dark:bg-indigo-300 dark:text-slate-950 dark:ring-slate-900"
                >
                  {notificationBadgeLabel}
                </span>
              )
            }
          </Link>
        );
      }
    );
  }

  return (
    <div
      ref={menuRef}
      className="relative lg:hidden"
    >
      <button
        type="button"
        onClick={
          () =>
            setOpen(
              (current) =>
                !current
            )
        }
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={
          [
            "relative inline-flex h-10 w-10 items-center justify-center rounded-lg border shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
            hasNotifications
              ? "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:hover:bg-indigo-500/15"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          ].join(
            " "
          )
        }
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        {
          hasNotifications && (
            <span
              aria-hidden="true"
              className="absolute right-0 top-0 flex min-w-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[0.625rem] font-bold leading-5 text-white ring-2 ring-white dark:bg-indigo-300 dark:text-slate-950 dark:ring-slate-950"
            >
              {notificationBadgeLabel}
            </span>
          )
        }
      </button>

      {
        open && (
          <div
            id={menuId}
            role="menu"
            aria-label="Mobile navigation"
            className="absolute right-0 z-50 mt-2 max-h-[calc(100dvh-5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Signed in
              </p>

              <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
                {
                  email ??
                  "Accountability Tracker"
                }
              </p>
            </div>

            <nav
              aria-label="Main mobile navigation"
              className="grid gap-1 p-2"
            >
              {renderLinks(
                mainItems
              )}
            </nav>

            <div className="border-t border-slate-200 p-2 dark:border-slate-800">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Account
              </p>

              <nav
                aria-label="Account mobile navigation"
                className="grid gap-1"
              >
                {renderLinks(
                  accountItems
                )}
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-1 flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                {
                  loggingOut
                    ? "Logging out..."
                    : "Log Out"
                }
              </button>
            </div>
          </div>
        )
      }
    </div>
  );
}
