import { redirect } from "next/navigation";

import PageHeader from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import AuditHistorySettings from "./AuditHistorySettings";
import DataExportSettings from "./DataExportSettings";
import DataRetentionSettings from "./DataRetentionSettings";
import DeleteTrackingHistorySettings from "./DeleteTrackingHistorySettings";
import TimezoneSettings from "./TimezoneSettings";
import UsernameSettings from "./UsernameSettings";


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
          username:
            true,

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

        <PageHeader
          eyebrow="Settings"
          title="Settings"
          description="User profile not found."
        />

      </main>
    );

  }

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Account"
        title="Settings"
        description="Keep your identity, timezone, privacy controls, and account history accurate."
      />

      <UsernameSettings
        currentUsername={
          profile.username
        }
      />

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
