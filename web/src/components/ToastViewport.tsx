"use client";

import {
  useEffect,
  useState
} from "react";

type Toast = {
  id: string;
  message: string;
  tone?: "error" | "success";
};

type ToastEventDetail = {
  message: string;
  tone?: "error" | "success";
};

declare global {
  interface WindowEventMap {
    "accountability-toast": CustomEvent<ToastEventDetail>;
  }
}

export function showToast(
  message: string,
  tone: "error" | "success" = "success"
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      "accountability-toast",
      {
        detail: {
          message,
          tone
        }
      }
    )
  );
}

export default function ToastViewport() {
  const [toasts, setToasts] =
    useState<Toast[]>(
      []
    );

  useEffect(
    () => {
      function handleToast(
        event: CustomEvent<ToastEventDetail>
      ) {
        const id =
          `${Date.now()}-${Math.random()}`;

        setToasts(
          (current) => [
            ...current,
            {
              id,
              message:
                event.detail.message,
              tone:
                event.detail.tone
            }
          ].slice(
            -3
          )
        );

        window.setTimeout(
          () => {
            setToasts(
              (current) =>
                current.filter(
                  (toast) =>
                    toast.id !==
                    id
                )
            );
          },
          3500
        );
      }

      window.addEventListener(
        "accountability-toast",
        handleToast
      );

      return () => {
        window.removeEventListener(
          "accountability-toast",
          handleToast
        );
      };
    },
    []
  );

  if (
    toasts.length ===
    0
  ) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-50 grid w-[min(100%-2rem,22rem)] gap-2"
    >
      {
        toasts.map(
          (toast) => (
            <div
              key={toast.id}
              role={
                toast.tone ===
                  "error"
                  ? "alert"
                  : "status"
              }
              className={
                [
                  "rounded-lg border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur",
                  toast.tone ===
                    "error"
                    ? "border-red-200 bg-red-50/95 text-red-700 dark:border-red-500/20 dark:bg-red-950/95 dark:text-red-200"
                    : "border-emerald-200 bg-emerald-50/95 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/95 dark:text-emerald-200"
                ].join(
                  " "
                )
              }
            >
              {toast.message}
            </div>
          )
        )
      }
    </div>
  );
}
