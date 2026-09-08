import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

import RevokeDeviceButton from "./RevokeDeviceButton";


const DEVICE_STALE_MINUTES =
  30;


// --------------------------------------------------
// FORMAT LAST SEEN
// --------------------------------------------------

function formatRelativeTime(
  date: Date | null
) {

  if (!date) {
    return "Never";
  }


  const now =
    Date.now();


  const differenceSeconds =
    Math.max(
      0,
      Math.floor(
        (
          now -
          date.getTime()
        ) /
        1000
      )
    );


  if (differenceSeconds < 60) {
    return `${differenceSeconds}s ago`;
  }


  const minutes =
    Math.floor(
      differenceSeconds /
      60
    );


  if (minutes < 60) {
    return `${minutes}m ago`;
  }


  const hours =
    Math.floor(
      minutes /
      60
    );


  if (hours < 24) {
    return `${hours}h ago`;
  }


  const days =
    Math.floor(
      hours /
      24
    );


  return `${days}d ago`;
}


// --------------------------------------------------
// DEVICES PAGE
// --------------------------------------------------

export default async function DevicesPage() {

  const supabase =
    await createClient();


  const {
    data: {
      user
    }
  } =
    await supabase.auth.getUser();


  if (!user) {
    redirect("/auth");
  }


  const devices =
  await prisma.device.findMany({
    where: {
      userId:
        user.id,

      // Only show devices that successfully
      // completed the extension linking process.
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
    Date.now();


  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 20px",
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
        Browsers linked to your accountability account.
      </p>


      <hr
        style={{
          margin: "30px 0"
        }}
      />


      {
        devices.length === 0
          ? (

            <p>
              No devices are linked yet.
            </p>

          )
          : (

            <div>

              {
                devices.map(
                  (device) => {

                    const stale =
                      !device.lastSeenAt ||
                      (
                        now -
                        device
                          .lastSeenAt
                          .getTime()
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
                          {
                            device.name ??
                            "Chrome Extension"
                          }
                        </h2>


                        <p>
                          <strong>
                            Status:
                          </strong>{" "}

                          {
                            status
                          }
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


                        <p>
                          <strong>
                            Incognito access:
                          </strong>{" "}

                          {
                            device
                              .incognitoEnabled
                              ? "Enabled"
                              : "Disabled"
                          }
                        </p>


                        {
                          device.revokedAt && (

                            <p>
                              <strong>
                                Revoked:
                              </strong>{" "}

                              {
                                device
                                  .revokedAt
                                  .toLocaleString()
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
                          Device ID: {
                            device.id
                          }
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
              }

            </div>

          )
      }

    </main>
  );
}