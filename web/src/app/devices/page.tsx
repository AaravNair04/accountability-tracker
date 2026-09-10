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
  date: Date,
  timeZone: string
) {
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
          user.id,

        confirmedAt: {
          not:
            null
        }
      },

      orderBy: {
        lastSeenAt:
          "desc"
      }
    });

  const now =
    new Date()
      .getTime();

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
        Confirmed browser extensions linked
        to your accountability account.
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
            devices.map(
              (device) => {
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

                const status =
                  device.revokedAt
                    ? "Revoked"
                    : stale
                      ? "Stale"
                      : "Active";

                const incognitoStatus =
                  device.incognitoEnabled ===
                    null
                    ? "Unknown"
                    : device.incognitoEnabled
                      ? "Enabled"
                      : "Disabled";

                return (
                  <article
                    key={
                      device.id
                    }
                    style={{
                      border:
                        "1px solid #ccc",

                      borderRadius:
                        "10px",

                      padding:
                        "20px",

                      marginBottom:
                        "18px"
                    }}
                  >
                    <h2
                      style={{
                        marginTop:
                          0
                      }}
                    >
                      {device.name}
                    </h2>

                    <p>
                      <strong>
                        Status:
                      </strong>{" "}
                      {status}
                    </p>

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

                    {
                      device.lastSeenAt && (
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
                      )
                    }

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
                      Device ID:{" "}
                      {device.id}
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
            )
          )
      }
    </main>
  );
}
