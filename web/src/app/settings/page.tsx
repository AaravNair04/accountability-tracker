import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getEnabledTrackedSites } from "@/lib/trackedSites";

import AuditHistorySettings from "./AuditHistorySettings";
import DataExportSettings from "./DataExportSettings";
import DataRetentionSettings from "./DataRetentionSettings";
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
          true,

        rawDataRetentionDays:
          true
      }

    });


  if (!profile) {

    return (
      <main className="app-page-narrow">

        <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
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

  const auditEvents =
    await prisma.auditEvent.findMany({
      where: {
        userId:
          user.id
      },

      orderBy: {
        createdAt:
          "desc"
      },

      take:
        25
    });


  return (
    <main className="app-page-narrow space-y-6">

      <Link href="/">
        ← Back to Dashboard
      </Link>


      <h1 className="text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
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


      <DataRetentionSettings
        currentRetentionDays={
          profile.rawDataRetentionDays
        }
      />


      <DeleteTrackingHistorySettings />


      <AuditHistorySettings
        events={auditEvents}
        timeZone={
          profile.timezone
        }
      />

    </main>
  );
}
