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
    <section
      style={{
        marginTop:
          "32px"
      }}
    >

      <h2>
        Tracked websites
      </h2>


      <p>
        These websites are tracked by the browser extension.
        Changes sync the next time the extension contacts the app.
      </p>


      <div
        style={{
          display:
            "flex",
          gap:
            "8px",
          alignItems:
            "center",
          margin:
            "16px 0"
        }}
      >
        <input
          type="text"
          value={hostname}
          placeholder="youtube.com"
          disabled={loading}
          onChange={
            (event) =>
              setHostname(
                event.target.value
              )
          }
          style={{
            flex:
              1,
            minWidth:
              0,
            padding:
              "10px 12px"
          }}
        />

        <button
          type="button"
          disabled={loading}
          onClick={addTrackedSite}
          style={{
            padding:
              "10px 16px",
            cursor:
              loading
                ? "not-allowed"
                : "pointer"
          }}
        >
          Add
        </button>
      </div>


      {
        sites.length > 0
          ? (
            <ul
              style={{
                listStyle:
                  "none",
                padding:
                  0,
                margin:
                  0,
                display:
                  "grid",
                gap:
                  "10px"
              }}
            >
              {
                sites.map(
                  (site) => (
                    <li
                      key={site.id}
                      style={{
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "8px",
                        padding:
                          "12px",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        gap:
                          "12px"
                      }}
                    >
                      <div>
                        <strong>
                          {site.hostname}
                        </strong>

                        <div
                          style={{
                            color:
                              "#666",
                            fontSize:
                              "14px",
                            marginTop:
                              "4px"
                          }}
                        >
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
            <p>
              No websites are currently tracked.
            </p>
          )
      }


      {
        message && (
          <p
            style={{
              marginTop:
                "10px"
            }}
          >
            {message}
          </p>
        )
      }

    </section>
  );
}
