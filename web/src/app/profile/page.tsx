import Link from "next/link";
import {
  redirect
} from "next/navigation";

import {
  prisma
} from "@/lib/prisma";
import {
  createClient
} from "@/lib/supabase/server";

function formatDate(
  date: Date,
  timeZone: string
) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone,
      dateStyle:
        "medium"
    }
  ).format(
    date
  );
}

function getInitials(
  email: string
) {
  const localPart =
    email.split(
      "@"
    )[0] ??
    "";

  return localPart
    .split(
      /[._-]+/
    )
    .filter(Boolean)
    .slice(
      0,
      2
    )
    .map(
      (part) =>
        part[0]?.toUpperCase()
    )
    .join(
      ""
    ) ||
    email[0]?.toUpperCase() ||
    "U";
}

function getMetadataString(
  value: unknown
) {
  return typeof value ===
    "string" &&
    value.trim().length > 0
    ? value.trim()
    : null;
}

export default async function ProfilePage() {
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

  if (
    !user.email
  ) {
    throw new Error(
      "Authenticated user does not have an email address."
    );
  }

  const profile =
    await prisma.user.upsert({
      where: {
        id:
          user.id
      },

      update: {
        email:
          user.email.toLowerCase()
      },

      create: {
        id:
          user.id,

        email:
          user.email.toLowerCase()
      },

      select: {
        email:
          true,

        createdAt:
          true,

        timezone:
          true,

        rawDataRetentionDays:
          true
      }
    });

  const [
    accountabilityPeerCount,
    holdingAccountableCount,
    trackedSiteCount,
    activeDeviceCount,
    reportCount,
    latestReport
  ] =
    await Promise.all([
      prisma.trustedPeer.count({
        where: {
          ownerId:
            user.id,

          status:
            "accepted",

          revokedAt:
            null
        }
      }),

      prisma.trustedPeer.count({
        where: {
          peerId:
            user.id,

          status:
            "accepted",

          revokedAt:
            null
        }
      }),

      prisma.trackedSite.count({
        where: {
          userId:
            user.id,

          enabled:
            true
        }
      }),

      prisma.device.count({
        where: {
          userId:
            user.id,

          confirmedAt: {
            not:
              null
          },

          revokedAt:
            null
        }
      }),

      prisma.dailyReport.count({
        where: {
          userId:
            user.id
        }
      }),

      prisma.dailyReport.findFirst({
        where: {
          userId:
            user.id
        },

        orderBy: {
          reportDate:
            "desc"
        },

        select: {
          reportDate:
            true
        }
      })
    ]);

  const displayName =
    getMetadataString(
      user.user_metadata?.full_name
    ) ||
    getMetadataString(
      user.user_metadata?.name
    ) ||
    profile.email.split(
      "@"
    )[0];

  return (
    <main className="app-page-narrow space-y-6">
      <Link
        href="/"
        className="text-sm"
      >
        ← Back to Dashboard
      </Link>

      <section className="app-card flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white shadow-sm dark:bg-indigo-500">
            {
              getInitials(
                profile.email
              )
            }
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              My Profile
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
              {displayName}
            </h1>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {profile.email}
            </p>
          </div>
        </div>

        <Link
          href="/settings"
          className="app-button-secondary inline-flex self-start no-underline sm:self-center"
        >
          Account Settings
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Accountability peers
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {accountabilityPeerCount}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            People who hold you accountable
          </p>
        </div>

        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            My peers
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {holdingAccountableCount}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            People you are holding accountable
          </p>
        </div>

        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Tracked websites
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {trackedSiteCount}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enabled tracking rules
          </p>
        </div>

        <div className="app-card">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Connected devices
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
            {activeDeviceCount}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Confirmed and active
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-card">
          <h2 className="app-section-title">
            Account Details
          </h2>

          <dl className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-2">
              <dt className="font-semibold text-slate-500 dark:text-slate-400">
                Email
              </dt>

              <dd className="text-slate-800 dark:text-slate-100">
                {profile.email}
              </dd>
            </div>

            <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-2">
              <dt className="font-semibold text-slate-500 dark:text-slate-400">
                Timezone
              </dt>

              <dd className="text-slate-800 dark:text-slate-100">
                {profile.timezone}
              </dd>
            </div>

            <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-2">
              <dt className="font-semibold text-slate-500 dark:text-slate-400">
                Account created
              </dt>

              <dd className="text-slate-800 dark:text-slate-100">
                {
                  formatDate(
                    profile.createdAt,
                    profile.timezone
                  )
                }
              </dd>
            </div>

            <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-2">
              <dt className="font-semibold text-slate-500 dark:text-slate-400">
                Data retention
              </dt>

              <dd className="text-slate-800 dark:text-slate-100">
                {
                  profile.rawDataRetentionDays
                    ? `${profile.rawDataRetentionDays} days`
                    : "Not limited"
                }
              </dd>
            </div>
          </dl>
        </div>

        <div className="app-card">
          <h2 className="app-section-title">
            Report History
          </h2>

          <p className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">
            {reportCount}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Daily reports generated
          </p>

          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
            Latest report:{" "}
            <strong className="text-slate-950 dark:text-white">
              {
                latestReport
                  ? formatDate(
                      latestReport.reportDate,
                      profile.timezone
                    )
                  : "None yet"
              }
            </strong>
          </p>
        </div>
      </section>

      <section className="app-card">
        <h2 className="app-section-title">
          Quick Actions
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/peers"
            className="app-button-secondary inline-flex items-center justify-center no-underline"
          >
            Add and View Peers
          </Link>

          <Link
            href="/peers/preview"
            className="app-button-secondary inline-flex items-center justify-center no-underline"
          >
            Preview What Peers See
          </Link>

          <Link
            href="/tracked-sites"
            className="app-button-secondary inline-flex items-center justify-center no-underline"
          >
            Tracked Websites
          </Link>

          <Link
            href="/devices"
            className="app-button-secondary inline-flex items-center justify-center no-underline"
          >
            Connected Devices
          </Link>
        </div>
      </section>
    </main>
  );
}
