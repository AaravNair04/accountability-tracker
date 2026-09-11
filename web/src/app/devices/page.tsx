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
      tone:
        "#8a1f1f",
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
      tone:
        "#8a5a00",
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
      tone:
        "#8a5a00",
      detail:
        "This browser has not synced recently."
    };
  }

  return {
    label:
      "Active",
    tone:
      "#276738",
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
    <article
      style={{
        border:
          "1px solid #ccc",
        borderRadius:
          "8px",
        padding:
          "18px",
        marginBottom:
          "14px"
      }}
    >
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          gap:
            "12px",
          alignItems:
            "flex-start"
        }}
      >
        <h3
          style={{
            margin:
              0
          }}
        >
          {device.name}
        </h3>

        <span
          style={{
            color:
              status.tone,
            fontWeight:
              700
          }}
        >
          {status.label}
        </span>
      </div>

      <p>
        {status.detail}
      </p>

      {
        !device.revokedAt && (
          <RenameDeviceForm
            deviceId={
              device.id
            }
            currentName={
              device.name
            }
          />
        )
      }

      <p>
        <strong>
          Last seen:
        </strong>{" "}
        {
          formatRelativeTime(
            device.lastSeenAt
          )
        }
      </p>

      <p>
        <strong>
          Last seen at:
        </strong>{" "}
        {
          formatDateTime(
            device.lastSeenAt,
            timeZone
          )
        }
      </p>

      <p>
        <strong>
          Linked at:
        </strong>{" "}
        {
          formatDateTime(
            device.confirmedAt,
            timeZone
          )
        }
      </p>

      <p>
        <strong>
          Incognito access:
        </strong>{" "}
        {incognitoStatus}
      </p>

      {
        device.revokedAt && (
          <p>
            <strong>
              Revoked:
            </strong>{" "}
            {
              formatDateTime(
                device.revokedAt,
                timeZone
              )
            }
          </p>
        )
      }

      <p
        style={{
          fontSize:
            "12px",
          color:
            "#666"
        }}
      >
        Device ID: {device.id}
      </p>

      {
        !device.revokedAt && (
          <RevokeDeviceButton
            deviceId={
              device.id
            }
          />
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
    <main
      style={{
        maxWidth:
          "800px",

        margin:
          "0 auto",

        padding:
          "40px 20px",

        fontFamily:
          "Arial, sans-serif"
      }}
    >
      <Link href="/">
        ← Back to Dashboard
      </Link>

      <h1>
        Devices
      </h1>

      <p>
        Browser extensions linked to your
        accountability account.
      </p>

      {
        devices.length ===
          0
          ? (
            <p>
              No confirmed devices are linked yet.
            </p>
          )
          : (
            sections.map(
              (section) => (
                <section
                  key={section.title}
                  style={{
                    marginTop:
                      "28px"
                  }}
                >
                  <h2>
                    {section.title}
                  </h2>

                  <p>
                    {section.description}
                  </p>

                  {
                    section.devices.length ===
                      0
                      ? (
                        <p>
                          No devices in this section.
                        </p>
                      )
                      : section.devices.map(
                          (device) => (
                            <DeviceCard
                              key={
                                device.id
                              }
                              device={
                                device
                              }
                              now={
                                now
                              }
                              timeZone={
                                timeZone
                              }
                            />
                          )
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
