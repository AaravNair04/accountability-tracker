"use client";

import {
  useState
} from "react";

import {
  showToast
} from "@/components/ToastViewport";


type UsernameSettingsProps = {
  currentUsername: string | null;
};

type UsernameResponse = {
  error?: string;
  message?: string;
  username?: string | null;
};


export default function UsernameSettings({
  currentUsername
}: UsernameSettingsProps) {
  const [username, setUsername] =
    useState(
      currentUsername ??
      ""
    );

  const [savedUsername, setSavedUsername] =
    useState(
      currentUsername
    );

  const [loading, setLoading] =
    useState(false);

  const normalizedUsername =
    username
      .trim()
      .toLowerCase();

  const unchanged =
    normalizedUsername ===
    (
      savedUsername ??
      ""
    );

  async function saveUsername() {
    setLoading(
      true
    );

    try {
      const response =
        await fetch(
          "/api/settings/username",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                username:
                  normalizedUsername ||
                  null
              })
          }
        );

      const data =
        await response.json()
          .catch(
            () => ({}) as UsernameResponse
          ) as UsernameResponse;

      if (
        !response.ok
      ) {
        showToast(
          data.error ??
          "Could not update username.",
          "error"
        );

        return;
      }

      setSavedUsername(
        data.username ??
        null
      );

      setUsername(
        data.username ??
        ""
      );

      showToast(
        data.message ??
        "Username updated."
      );

    } catch (error) {
      console.error(
        "Username update failed:",
        error
      );

      showToast(
        "Could not update username.",
        "error"
      );

    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <section className="app-card">
      <h2 className="app-section-title">
        Username
      </h2>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Peers will see this name next to your email, making accountability reports easier to recognize.
      </p>

      <div className="mt-5 grid gap-2">
        <label
          htmlFor="username"
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Username
        </label>

        <div className="flex max-w-md overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900">
          <span className="border-r border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            @
          </span>

          <input
            id="username"
            value={username}
            placeholder="aarav"
            maxLength={24}
            className="min-w-0 flex-1 border-0 px-3 py-2.5 text-sm shadow-none focus:border-transparent focus:ring-0"
            onChange={
              (event) =>
                setUsername(
                  event.target.value
                )
            }
          />
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Use 3-24 letters, numbers, or underscores. Leave blank to remove it.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="app-button-primary"
          disabled={
            loading ||
            unchanged
          }
          onClick={saveUsername}
        >
          {
            loading
              ? "Saving..."
              : "Save Username"
          }
        </button>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Current:{" "}
          <strong className="text-slate-700 dark:text-slate-200">
            {
              savedUsername
                ? `@${savedUsername}`
                : "Not set"
            }
          </strong>
        </p>
      </div>
    </section>
  );
}
