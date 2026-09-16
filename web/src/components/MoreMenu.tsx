"use client";

import Link from "next/link";
import {
  usePathname
} from "next/navigation";
import {
  useEffect,
  useId,
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

  const buttonRef =
    useRef<HTMLButtonElement | null>(
      null
    );

  const menuRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const itemRefs =
    useRef<Array<HTMLAnchorElement | null>>(
      []
    );

  const menuId =
    useId();

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

  function focusItem(
    index: number
  ) {
    const nextIndex =
      (
        index +
        items.length
      ) %
      items.length;

    itemRefs.current[
      nextIndex
    ]?.focus();
  }

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      <button
        ref={buttonRef}
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
        aria-controls={menuId}
        onKeyDown={
          (event) => {
            if (
              event.key ===
              "ArrowDown"
            ) {
              event.preventDefault();

              setOpen(
                true
              );

              window.setTimeout(
                () =>
                  focusItem(
                    0
                  ),
                0
              );
            }
          }
        }
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
            id={menuId}
            role="menu"
            aria-label="More navigation"
            onKeyDown={
              (event) => {
                const currentIndex =
                  itemRefs.current.findIndex(
                    (item) =>
                      item ===
                      document.activeElement
                  );

                if (
                  event.key ===
                  "ArrowDown"
                ) {
                  event.preventDefault();

                  focusItem(
                    currentIndex +
                    1
                  );
                }

                if (
                  event.key ===
                  "ArrowUp"
                ) {
                  event.preventDefault();

                  focusItem(
                    currentIndex -
                    1
                  );
                }

                if (
                  event.key ===
                  "Home"
                ) {
                  event.preventDefault();

                  focusItem(
                    0
                  );
                }

                if (
                  event.key ===
                  "End"
                ) {
                  event.preventDefault();

                  focusItem(
                    items.length -
                    1
                  );
                }

                if (
                  event.key ===
                  "Escape"
                ) {
                  setOpen(
                    false
                  );

                  buttonRef.current?.focus();
                }
              }
            }
            className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            {
              items.map(
                (
                  item,
                  index
                ) => (
                  <Link
                    key={item.href}
                    ref={
                      (element) => {
                        itemRefs.current[
                          index
                        ] =
                          element;
                      }
                    }
                    href={item.href}
                    role="menuitem"
                    aria-current={
                      isActiveRoute(
                        pathname,
                        item.href
                      )
                        ? "page"
                        : undefined
                    }
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
