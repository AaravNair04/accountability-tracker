import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getEnabledTrackedSites } from "@/lib/trackedSites";

import DataExportSettings from "./DataExportSettings";
import DeleteTrackingHistorySettings from "./DeleteTrackingHistorySettings";
import TrackedSitesSettings from "./TrackedSitesSettings";
import TimezoneSettings from "./TimezoneSettings";


export default async function SettingsPage() {

  // Get logged-in user.
  const supabase =
    await createClient();


  const {
    data: { user }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  // Load current timezone.
  const profile =
    await prisma.user.findUnique({

      where: {
        id:
          user.id
      },

      select: {
        timezone:
          true
      }

    });


  if (!profile) {

    return (
      <main
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "40px 20px",
          fontFamily: "Arial, sans-serif"
        }}
      >

        <h1>
          Settings
        </h1>

        <p>
          User profile not found.
        </p>

      </main>
    );

  }

  const trackedSites =
    await getEnabledTrackedSites(
      user.id
    );


  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif"
      }}
    >

      <Link href="/">
        ← Back to Dashboard
      </Link>


      <h1>
        Settings
      </h1>


      <TimezoneSettings
        currentTimezone={
          profile.timezone
        }
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


      <DataExportSettings />


      <DeleteTrackingHistorySettings />

    </main>
  );
}
