import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  createClient
} from "@/lib/supabase/server";

import {
  prisma
} from "@/lib/prisma";

import {
  checkRateLimit,
  rateLimitResponse
} from "@/lib/rateLimit";

import {
  sendReportDeliveryEmail
} from "@/lib/reports/reportDeliveryEmail";


export async function POST(
  request: NextRequest
) {
  try {
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
      return NextResponse.json(
        {
          error:
            "You must be logged in."
        },
        {
          status:
            401
        }
      );
    }

    const rateLimit =
      checkRateLimit({
        key:
          `report:resend-emails:${user.id}`,
        limit:
          10,
        windowMs:
          60 * 60 * 1000
      });

    if (
      !rateLimit.allowed
    ) {
      return rateLimitResponse(
        rateLimit.retryAfterSeconds
      );
    }

    const body =
      await request.json()
        .catch(
          () => ({})
        );

    const reportId =
      typeof body.reportId ===
      "string"
        ? body.reportId
        : "";

    if (
      !reportId
    ) {
      return NextResponse.json(
        {
          error:
            "Report id is required."
        },
        {
          status:
            400
        }
      );
    }

    const report =
      await prisma.dailyReport.findFirst({
        where: {
          id:
            reportId,

          userId:
            user.id
        },

        select: {
          id:
            true
        }
      });

    if (
      !report
    ) {
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

    const deliveries =
      await prisma.reportDelivery.findMany({
        where: {
          reportId,

          emailSentAt:
            null
        },

        select: {
          id:
            true
        }
      });

    let sent =
      0;
    let failed =
      0;
    let skipped =
      0;

    for (
      const delivery
      of deliveries
    ) {
      const result =
        await sendReportDeliveryEmail(
          delivery.id
        );

      if (
        result.sent
      ) {
        sent +=
          1;
      } else if (
        result.skipped
      ) {
        skipped +=
          1;
      } else {
        failed +=
          1;
      }
    }

    return NextResponse.json({
      success:
        failed ===
        0,

      attempted:
        deliveries.length,

      sent,
      failed,
      skipped
    });

  } catch (error) {
    console.error(
      "[Reports] Email retry failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to retry report emails."
      },
      {
        status:
          500
      }
    );
  }
}
