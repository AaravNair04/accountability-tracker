import Link from "next/link";
import {
  redirect
} from "next/navigation";

import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import {
  prisma
} from "@/lib/prisma";
import {
  createClient
} from "@/lib/supabase/server";

import RevokeDeviceButton from "./RevokeDeviceButton";
import RenameDeviceForm from "./RenameDeviceForm";

const DEVICE_STALE_MINUTES =
  30;

function formatRelativeTime(
  date: Date | null
) {
  if (
    !date
  ) {
    return "Never";
  }

  const differenceSeconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          date.getTime()
        ) /
        1000
      )
    );

  if (
    differenceSeconds <
    60
  ) {
    return `${differenceSeconds}s ago`;
  }

  const minutes =
    Math.floor(
      differenceSeconds /
      60
    );

  if (
    minutes <
    60
  ) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes /
      60
    );

  if (
    hours <
    24
  ) {
    return `${hours}h ago`;
  }

  return `${Math.floor(
    hours /
    24
  )}d ago`;
}

function formatDateTime(
  date: Date | null,
  timeZone: string
) {
  if (
    !date
  ) {
    return "Never";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone,
      dateStyle:
        "medium",
      timeStyle:
        "medium"
    }
  ).format(
    date
  );
}

type Device =
  Awaited<
    ReturnType<
      typeof prisma.device.findMany
    >
  >[number];

function getDeviceStatus(
  device: Device,
  now: number
) {
  if (
    device.revokedAt
  ) {
    return {
      label:
        "Revoked",
      className:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
      detail:
        "This browser can no longer upload tracking data."
    };
  }

  if (
    !device.confirmedAt
  ) {
    return {
      label:
        "Unconfirmed",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
      detail:
        "The extension has not completed its first verification yet."
    };
  }

  const stale =
    !device.lastSeenAt ||
    (
      now -
      device.lastSeenAt.getTime()
    ) >
    (
      DEVICE_STALE_MINUTES *
      60 *
      1000
    );

  if (
    stale
  ) {
    return {
      label:
        "Needs attention",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
      detail:
        "This browser has not synced recently."
    };
  }

  return {
    label:
      "Active",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
    detail:
      "This browser is syncing normally."
  };
}

function DeviceCard({
  device,
  now,
  timeZone
}: {
  device: Device;
  now: number;
  timeZone: string;
}) {
  const status =
    getDeviceStatus(
      device,
      now
    );

  const incognitoStatus =
    device.incognitoEnabled ===
      null
      ? "Unknown"
      : device.incognitoEnabled
        ? "Enabled"
        : "Disabled";

  return (
    <article className="app-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
            {device.name}
          </h3>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {status.detail}
          </p>
        </div>

        <span
          className={
            [
              "inline-flex rounded-full border px-3 py-1 text-sm font-semibold",
              status.className
            ].join(
              " "
            )
          }
        >
          {status.label}
        </span>
      </div>

      {
        !device.revokedAt && (
          <div className="mt-4">
            <RenameDeviceForm
              deviceId={device.id}
              currentName={device.name}
            />
          </div>
        )
      }

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <dt className="font-semibold text-slate-500 dark:text-slate-400">
            Last seen
          </dt>

          <dd className="mt-1 text-slate-800 dark:text-slate-100">
            {
              formatRelativeTime(
                device.lastSeenAt
              )
            }
          </dd>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <dt className="font-semibold text-slate-500 dark:text-slate-400">
            Last sync time
          </dt>

          <dd className="mt-1 text-slate-800 dark:text-slate-100">
            {
              formatDateTime(
                device.lastSeenAt,
                timeZone
              )
            }
          </dd>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <dt className="font-semibold text-slate-500 dark:text-slate-400">
            Linked
          </dt>

          <dd className="mt-1 text-slate-800 dark:text-slate-100">
            {
              formatDateTime(
                device.confirmedAt,
                timeZone
              )
            }
          </dd>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <dt className="font-semibold text-slate-500 dark:text-slate-400">
            Incognito access
          </dt>

          <dd className="mt-1 text-slate-800 dark:text-slate-100">
            {incognitoStatus}
          </dd>
        </div>
      </dl>

      {
        device.revokedAt && (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            Revoked{" "}
            {
              formatDateTime(
                device.revokedAt,
                timeZone
              )
            }
          </p>
        )
      }

      <p className="mt-4 break-all text-xs text-slate-400 dark:text-slate-500">
        Device ID: {device.id}
      </p>

      {
        !device.revokedAt && (
          <div className="mt-4">
            <RevokeDeviceButton
              deviceId={device.id}
            />
          </div>
        )
      }
    </article>
  );
}

export default async function DevicesPage() {
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

  const timeZone =
    profile?.timezone ??
    "Asia/Kolkata";

  const devices =
    await prisma.device.findMany({
      where: {
        userId:
          user.id
      },

      orderBy: {
        lastSeenAt:
          "desc"
      }
    });

  const now =
    new Date()
      .getTime();

  const activeDevices:
    Device[] = [];

  const attentionDevices:
    Device[] = [];

  const revokedDevices:
    Device[] = [];

  for (
    const device
    of devices
  ) {
    const status =
      getDeviceStatus(
        device,
        now
      );

    if (
      status.label ===
      "Revoked"
    ) {
      revokedDevices.push(
        device
      );
    } else if (
      status.label ===
      "Active"
    ) {
      activeDevices.push(
        device
      );
    } else {
      attentionDevices.push(
        device
      );
    }
  }

  const sections =
    [
      {
        title:
          "Active",
        description:
          "Confirmed browsers that have synced recently.",
        devices:
          activeDevices
      },
      {
        title:
          "Needs attention",
        description:
          "Browsers that are stale or not fully confirmed yet.",
        devices:
          attentionDevices
      },
      {
        title:
          "Revoked",
        description:
          "Browsers that can no longer upload tracking data.",
        devices:
          revokedDevices
      }
    ];

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Devices"
        title="Connected Devices"
        description="Browser extensions linked to your accountability account."
        action={
          <Link
            href="/devices/link"
            className="app-button-primary inline-flex no-underline"
          >
            Link Extension
          </Link>
        }
      />

      {
        devices.length ===
          0
          ? (
            <EmptyState
              title="No browser extension linked yet"
              description="Connect the browser extension so Accountability Tracker can receive usage sessions from this device."
              actionHref="/devices/link"
              actionLabel="Connect browser extension"
            />
          )
          : (
            sections.map(
              (section) => (
                <section
                  key={section.title}
                  className="space-y-3"
                >
                  <div>
                    <h2 className="app-section-title">
                      {section.title}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {section.description}
                    </p>
                  </div>

                  {
                    section.devices.length ===
                      0
                      ? (
                        <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                          No devices in this section.
                        </p>
                      )
                      : (
                        <div className="grid gap-3">
                          {
                            section.devices.map(
                              (device) => (
                                <DeviceCard
                                  key={device.id}
                                  device={device}
                                  now={now}
                                  timeZone={timeZone}
                                />
                              )
                            )
                          }
                        </div>
                      )
                  }
                </section>
              )
            )
          )
      }
    </main>
  );
}
