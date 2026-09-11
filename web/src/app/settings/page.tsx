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


      <section className="app-card">
        <h2 className="app-section-title">
          Tracked Websites
        </h2>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Manage the sites watched by the browser extension on
          the dedicated tracked websites page.
        </p>

        <Link
          href="/tracked-sites"
          className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white no-underline shadow-sm hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          Manage Tracked Websites
        </Link>
      </section>


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
