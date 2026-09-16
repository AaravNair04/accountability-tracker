import {
  prisma
} from "@/lib/prisma";

import {
  sendReportReadyEmail
} from "@/lib/email";


export async function sendReportDeliveryEmail(
  deliveryId: string
) {
  const delivery =
    await prisma.reportDelivery.findUnique({
      where: {
        id:
          deliveryId
      },

      include: {
        peer: {
          select: {
            email:
              true
          }
        },

        report: {
          select: {
            id:
              true,

            reportDate:
              true,

            timezone:
              true,

            userId:
              true,

            user: {
              select: {
                email:
                  true
              }
            }
          }
        }
      }
    });

  if (
    !delivery
  ) {
    throw new Error(
      "Report delivery not found."
    );
  }

  if (
    delivery.emailSentAt
  ) {
    return {
      sent:
        false,

      skipped:
        true,

      alreadySent:
        true
    };
  }

  const emailResult =
    await sendReportReadyEmail({
      to:
        delivery.peer.email,

      ownerEmail:
        delivery.report.user.email,

      ownerId:
        delivery.report.userId,

      reportId:
        delivery.report.id,

      reportDate:
        delivery.report.reportDate,

      timezone:
        delivery.report.timezone,

      idempotencyKey:
        `report-delivery:${delivery.id}`
    });

  const emailAttemptedAt =
    new Date();

  await prisma.reportDelivery.update({
    where: {
      id:
        delivery.id
    },

    data:
      emailResult.sent
        ? {
            emailAttemptedAt,
            emailSentAt:
              emailAttemptedAt,
            emailSkippedAt:
              null,
            emailFailedAt:
              null,
            emailFailureReason:
              null
          }
        : emailResult.skipped
          ? {
              emailAttemptedAt,
              emailSkippedAt:
                emailAttemptedAt,
              emailFailedAt:
                null,
              emailFailureReason:
                emailResult.error ??
                "Email skipped."
            }
          : {
              emailAttemptedAt,
              emailSkippedAt:
                null,
              emailFailedAt:
                emailAttemptedAt,
              emailFailureReason:
                emailResult.error ??
                "Email send failed."
            }
  });

  return {
    ...emailResult,

    alreadySent:
      false
  };
}
