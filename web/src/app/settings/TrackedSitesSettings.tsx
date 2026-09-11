"use client";

import {
  useState
} from "react";


type TrackedSite = {
  id: string;
  hostname: string;
  site: string;
};


type Props = {
  trackedSites: TrackedSite[];
};


export default function TrackedSitesSettings({
  trackedSites
}: Props) {
  const [
    sites,
    setSites
  ] =
    useState(
      trackedSites
    );

  const [
    hostname,
    setHostname
  ] =
    useState("");

  const [
    loading,
    setLoading
  ] =
    useState(false);

  const [
    message,
    setMessage
  ] =
    useState("");


  async function addTrackedSite() {
    const nextHostname =
      hostname.trim();

    if (
      !nextHostname
    ) {
      setMessage(
        "Enter a hostname first."
      );

      return;
    }

    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/tracked-sites",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                hostname:
                  nextHostname
              })
          }
        );

      const data =
        await response.json() as {
          error?: string;
          trackedSite?: TrackedSite;
        };

      if (
        !response.ok ||
        !data.trackedSite
      ) {
        setMessage(
          data.error ??
          "Could not add tracked site."
        );

        return;
      }

      setSites(
        (currentSites) => [
          data.trackedSite!,
          ...currentSites.filter(
            (site) =>
              site.id !==
              data.trackedSite!.id
          )
        ].sort(
          (
            firstSite,
            secondSite
          ) =>
            firstSite.hostname.localeCompare(
              secondSite.hostname
            )
        )
      );

      setHostname(
        ""
      );

      setMessage(
        `${data.trackedSite.hostname} is now tracked.`
      );

    } catch (error) {
      console.error(
        "Tracked site add failed:",
        error
      );

      setMessage(
        "Could not add tracked site."
      );

    } finally {
      setLoading(
        false
      );
    }
  }


  async function removeTrackedSite(
    trackedSiteId: string
  ) {
    setLoading(
      true
    );

    setMessage(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/tracked-sites",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                trackedSiteId
              })
          }
        );

      const data =
        await response.json() as {
          error?: string;
        };

      if (
        !response.ok
      ) {
        setMessage(
          data.error ??
          "Could not remove tracked site."
        );

        return;
      }

      setSites(
        (currentSites) =>
          currentSites.filter(
            (site) =>
              site.id !==
              trackedSiteId
          )
      );

      setMessage(
        "Tracked site removed."
      );

    } catch (error) {
      console.error(
        "Tracked site removal failed:",
        error
      );

      setMessage(
        "Could not remove tracked site."
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
        Tracked websites
      </h2>


      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        These websites are tracked by the browser extension.
        Changes sync the next time the extension contacts the app.
      </p>


      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={hostname}
          placeholder="Enter a hostname (e.g. youtube.com)"
          disabled={loading}
          onChange={
            (event) =>
              setHostname(
                event.target.value
              )
          }
          className="min-w-0 flex-1 rounded-lg border px-4 py-3"
        />

        <button
          type="button"
          disabled={loading}
          onClick={addTrackedSite}
          className="app-button-primary"
        >
          Add
        </button>
      </div>


      {
        sites.length > 0
          ? (
            <ul
              className="mt-5 grid gap-3"
            >
              {
                sites.map(
                  (site) => (
                    <li
                      key={site.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <strong className="text-slate-950 dark:text-white">
                          {site.hostname}
                        </strong>

                        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Saved as {site.site}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={
                          () =>
                            removeTrackedSite(
                              site.id
                            )
                        }
                        className="app-button-secondary"
                      >
                        Remove
                      </button>
                    </li>
                  )
                )
              }
            </ul>
          )
          : (
            <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
              No websites are currently tracked.
            </p>
          )
      }


      {
        message && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {message}
          </p>
        )
      }

    </section>
  );
}
