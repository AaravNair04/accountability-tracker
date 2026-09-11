import Link from "next/link";
import {
  redirect
} from "next/navigation";

import {
  createClient
} from "@/lib/supabase/server";
import {
  getEnabledTrackedSites
} from "@/lib/trackedSites";

import TrackedSitesSettings from "../settings/TrackedSitesSettings";


export default async function TrackedSitesPage() {
  const supabase =
    await createClient();

  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();

  if (
    !user
  ) {
    redirect(
      "/auth"
    );
  }

  const trackedSites =
    await getEnabledTrackedSites(
      user.id
    );

  return (
    <main className="app-page-narrow space-y-6">
      <Link href="/">
        ← Back to Dashboard
      </Link>

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
          Extension Configuration
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
          Tracked Websites
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Choose which websites the browser extension should track.
          Changes sync the next time the extension checks in.
        </p>
      </section>

      <TrackedSitesSettings
        trackedSites={
          trackedSites.map(
            (trackedSite) => ({
              id:
                trackedSite.id,

              hostname:
                trackedSite.hostname,

              site:
                trackedSite.site
            })
          )
        }
      />
    </main>
  );
}
