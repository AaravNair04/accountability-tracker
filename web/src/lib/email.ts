type SendReportReadyEmailInput = {
  to: string;
  ownerEmail: string;
  ownerId: string;
  reportId: string;
  reportDate: Date;
  timezone: string;
};


type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};


function getAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL;

  if (
    configuredUrl
  ) {
    return configuredUrl.replace(
      /\/$/,
      ""
    );
  }

  const vercelUrl =
    process.env.VERCEL_URL;

  if (
    vercelUrl
  ) {
    return `https://${vercelUrl}`;
  }

  return "https://accountability-tracker-eosin.vercel.app";
}


function getReportDateLabel(
  reportDate: Date,
  timezone: string
) {
  return reportDate.toLocaleDateString(
    "en-US",
    {
      timeZone:
        timezone,

      year:
        "numeric",

      month:
        "long",

      day:
        "numeric"
    }
  );
}


function escapeHtml(
  value: string
) {
  return value
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


async function sendEmail({
  to,
  subject,
  text,
  html
}: SendEmailInput) {
  const apiKey =
    process.env.RESEND_API_KEY;

  const from =
    process.env.REPORT_EMAIL_FROM;

  if (
    !apiKey ||
    !from
  ) {
    console.warn(
      "[Email] Report email skipped because RESEND_API_KEY or REPORT_EMAIL_FROM is not configured."
    );

    return {
      sent:
        false,

      skipped:
        true
    };
  }

  let response:
    Response;

  try {
    response =
      await fetch(
        "https://api.resend.com/emails",
        {
          method:
            "POST",

          headers: {
            "Authorization":
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              from,
              to,
              subject,
              text,
              html
            })
        }
      );
  } catch (error) {
    console.error(
      "[Email] Report email request failed:",
      error
    );

    return {
      sent:
        false,

      skipped:
        false
    };
  }

  if (
    !response.ok
  ) {
    console.error(
      "[Email] Report email failed:",
      response.status,
      await response.text()
    );

    return {
      sent:
        false,

      skipped:
        false
    };
  }

  return {
    sent:
      true,

    skipped:
      false
  };
}


export async function sendReportReadyEmail({
  to,
  ownerEmail,
  ownerId,
  reportId,
  reportDate,
  timezone
}: SendReportReadyEmailInput) {
  const appUrl =
    getAppUrl();

  const reportUrl =
    `${appUrl}/peers/view/${ownerId}/reports/${reportId}`;

  const reportDateLabel =
    getReportDateLabel(
      reportDate,
      timezone
    );

  const subject =
    `${ownerEmail}'s accountability report is ready`;

  const safeOwnerEmail =
    escapeHtml(
      ownerEmail
    );

  const safeReportDateLabel =
    escapeHtml(
      reportDateLabel
    );

  const safeReportUrl =
    escapeHtml(
      reportUrl
    );

  const text =
    [
      `${ownerEmail}'s accountability report for ${reportDateLabel} is ready.`,
      "",
      `View it here: ${reportUrl}`
    ].join(
      "\n"
    );

  const html =
    [
      `<p>${safeOwnerEmail}'s accountability report for <strong>${safeReportDateLabel}</strong> is ready.</p>`,
      `<p><a href="${safeReportUrl}">View the report</a></p>`
    ].join(
      ""
    );

  return sendEmail({
    to,
    subject,
    text,
    html
  });
}
