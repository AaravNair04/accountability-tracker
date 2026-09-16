import {
  redirect
} from "next/navigation";

import PageHeader from "@/components/PageHeader";
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
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Extension Configuration"
        title="Tracked Websites"
        description="Choose the websites that should count toward activity and reports. Changes sync the next time the extension checks in."
      />

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
