"use client";

import Link from "next/link";
import {
  usePathname
} from "next/navigation";
import {
  useEffect,
  useRef,
  useState
} from "react";

type MoreMenuProps = {
  items: Array<{
    href: string;
    label: string;
  }>;
};

function isActiveRoute(
  pathname: string,
  href: string
) {
  return pathname ===
    href ||
    pathname.startsWith(
      `${href}/`
    );
}

export default function MoreMenu({
  items
}: MoreMenuProps) {
  const [open, setOpen] =
    useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const pathname =
    usePathname();

  const hasActiveItem =
    items.some(
      (item) =>
        isActiveRoute(
          pathname,
          item.href
        )
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

  return (
    <div
      ref={menuRef}
      className="relative"
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
        aria-label="Open more navigation"
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          [
            "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
            hasActiveItem
              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          ].join(
            " "
          )
        }
      >
        More
      </button>

      {
        open && (
          <div
            role="menu"
            aria-label="More navigation"
            className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            {
              items.map(
                (item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={
                      () =>
                        setOpen(
                          false
                        )
                    }
                    className="block px-4 py-2.5 text-sm font-semibold text-slate-700 no-underline transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    {item.label}
                  </Link>
                )
              )
            }
          </div>
        )
      }
    </div>
  );
}
