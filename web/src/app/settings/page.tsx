import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import AuditHistorySettings from "./AuditHistorySettings";
import DataExportSettings from "./DataExportSettings";
import DataRetentionSettings from "./DataRetentionSettings";
import DeleteTrackingHistorySettings from "./DeleteTrackingHistorySettings";
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


  const [
    profile,
    auditEvents
  ] =
    await Promise.all([
      prisma.user.findUnique({
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
      }),

      prisma.auditEvent.findMany({
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
      })
    ]);


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
