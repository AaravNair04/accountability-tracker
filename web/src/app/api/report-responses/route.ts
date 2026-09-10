import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";


export async function POST(
  request: Request
) {

  try {

    // --------------------------------------------------
    // AUTHENTICATE USER
    // --------------------------------------------------

    const supabase =
      await createClient();


    const {
      data: { user }
    } =
      await supabase.auth.getUser();


    if (!user) {

      return NextResponse.json(
        {
          error:
            "Unauthorized"
        },
        {
          status:
            401
        }
      );

    }


    // --------------------------------------------------
    // READ BODY
    // --------------------------------------------------

    const body =
      await request.json();


    const reportId =
      body.reportId;


    const message =
      typeof body.message ===
        "string"
        ? body.message.trim()
        : "";


    // --------------------------------------------------
    // VALIDATE REPORT ID
    // --------------------------------------------------

    if (
      !reportId ||
      typeof reportId !==
        "string"
    ) {

      return NextResponse.json(
        {
          error:
            "Report ID is required."
        },
        {
          status:
            400
        }
      );

    }


    // --------------------------------------------------
    // VALIDATE MESSAGE
    // --------------------------------------------------

    if (
      message.length === 0
    ) {

      return NextResponse.json(
        {
          error:
            "Response message cannot be empty."
        },
        {
          status:
            400
        }
      );

    }


    if (
      message.length > 1000
    ) {

      return NextResponse.json(
        {
          error:
            "Response message must be 1000 characters or fewer."
        },
        {
          status:
            400
        }
      );

    }


    // --------------------------------------------------
    // LOAD REPORT
    // --------------------------------------------------

    const report =
      await prisma.dailyReport.findUnique({

        where: {
          id:
            reportId
        },

        select: {
          id: true,
          userId: true
        }

      });


    if (!report) {

      return NextResponse.json(
        {
          error:
            "Report not found."
        },
        {
          status:
            404
        }
      );

    }


    // --------------------------------------------------
    // PREVENT SELF RESPONSE
    // --------------------------------------------------

    if (
      report.userId ===
      user.id
    ) {

      return NextResponse.json(
        {
          error:
            "You cannot respond to your own report."
        },
        {
          status:
            403
        }
      );

    }


    // --------------------------------------------------
    // VERIFY ACCEPTED PEER RELATIONSHIP
    // --------------------------------------------------

    const relationship =
      await prisma.trustedPeer.findUnique({

        where: {

          ownerId_peerId: {

            ownerId:
              report.userId,

            peerId:
              user.id

          }

        },

        select: {
          status:
            true,

          revokedAt:
            true
        }

      });


    if (
      !relationship ||
      relationship.status !==
        "accepted" ||
      relationship.revokedAt !==
        null
    ) {

      return NextResponse.json(
        {
          error:
            "You are not an accepted accountability peer for this user."
        },
        {
          status:
            403
        }
      );

    }


    // --------------------------------------------------
    // VERIFY REPORT DELIVERY
    // --------------------------------------------------

    const delivery =
      await prisma.reportDelivery.findUnique({

        where: {

          reportId_peerId: {

            reportId:
              report.id,

            peerId:
              user.id

          }

        },

        select: {
          id:
            true
        }

      });


    if (!delivery) {

      return NextResponse.json(
        {
          error:
            "This report was not delivered to you."
        },
        {
          status:
            403
        }
      );

    }


    // --------------------------------------------------
    // CREATE OR UPDATE RESPONSE
    // --------------------------------------------------

    const response =
      await prisma.reportResponse.upsert({

        where: {

          reportId_peerId: {

            reportId:
              report.id,

            peerId:
              user.id

          }

        },


        // Editing makes the response new again.
        update: {

          message:
            message,

          ownerViewedAt:
            null

        },


        create: {

          reportId:
            report.id,

          peerId:
            user.id,

          message:
            message,

          ownerViewedAt:
            null

        }

      });


    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return NextResponse.json(
      {
        success:
          true,

        response
      },
      {
        status:
          200
      }
    );

  } catch (error) {

    console.error(
      "Report response error:",
      error
    );


    return NextResponse.json(
      {
        error:
          "Failed to save report response."
      },
      {
        status:
          500
      }
    );

  }

}
