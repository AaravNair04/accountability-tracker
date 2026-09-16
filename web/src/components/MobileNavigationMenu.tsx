"use client";

import Link from "next/link";
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
  accountItems
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

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              isActive
                ? "page"
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
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold no-underline transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
              ].join(
                " "
              )
            }
          >
            {item.label}
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
        aria-label="Open navigation menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          {
            open
              ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </>
              )
              : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )
          }
        </svg>
      </button>

      {
        open && (
          <div
            id={menuId}
            role="menu"
            aria-label="Mobile navigation"
            className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
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
