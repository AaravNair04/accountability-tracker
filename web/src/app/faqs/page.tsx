import {
  redirect
} from "next/navigation";

import PageHeader from "@/components/PageHeader";
import {
  createClient
} from "@/lib/supabase/server";

const faqSections = [
  {
    title:
      "Reports",

    items: [
      {
        question:
          "What is the difference between My Reports and My Peers' Reports?",

        answer:
          "My Reports are your own generated accountability reports. My Peers' Reports are reports shared by people you are keeping accountable."
      },
      {
        question:
          "When is a daily report generated?",

        answer:
          "A completed report is generated for a finished day. Today's report can be generated as a preview, but peer delivery is meant for completed days."
      },
      {
        question:
          "Why do some reports show no peer responses?",

        answer:
          "Peers can view a shared report without leaving a response. Responses appear only after a peer writes and saves feedback."
      }
    ]
  },
  {
    title:
      "Tracking Coverage",

    items: [
      {
        question:
          "What does Good mean?",

        answer:
          "Good means tracking was working normally for that time window."
      },
      {
        question:
          "What does Limited mean?",

        answer:
          "Limited means the app had partial tracking information, so some detail may be missing."
      },
      {
        question:
          "What does Paused mean?",

        answer:
          "Paused means tracking was intentionally paused or the device was not actively sending tracking data."
      },
      {
        question:
          "What does Unknown mean?",

        answer:
          "Unknown means the app could not confidently verify what happened during that time."
      }
    ]
  },
  {
    title:
      "Peers",

    items: [
      {
        question:
          "Who can see my reports?",

        answer:
          "Only accepted accountability peers can see reports that are shared with them. Pending, rejected, or removed peers do not have report access."
      },
      {
        question:
          "What does the red dot on View accountability mean?",

        answer:
          "It highlights the live accountability action for peers you are keeping accountable from the dashboard."
      },
      {
        question:
          "Can peers identify me by username?",

        answer:
          "Yes. If you set a username in Settings, peers see that name alongside your email so reports and relationships are easier to recognize."
      },
      {
        question:
          "Can I remove a peer?",

        answer:
          "Yes. You can remove peer access from the Peers page. Removed peers can no longer view your accountability reports."
      }
    ]
  },
  {
    title:
      "Email And Data",

    items: [
      {
        question:
          "Why are report emails paused?",

        answer:
          "Email sending is paused until a verified sending domain is configured. Reports and peer links still work inside the app."
      },
      {
        question:
          "Do I need email for accountability to work?",

        answer:
          "No. Peers can still open shared reports from the app. Email is only a notification layer."
      },
      {
        question:
          "Can I export my data?",

        answer:
          "Yes. Settings includes data export options for your account, reports, tracking history, peers, and related records."
      },
      {
        question:
          "Can I delete tracking history?",

        answer:
          "Yes. Settings includes controls for deleting tracking history and configuring data retention."
      }
    ]
  }
];

export default async function FaqsPage() {
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

  return (
    <main className="app-page-narrow space-y-6">
      <PageHeader
        backHref="/"
        backLabel="← Back to Dashboard"
        eyebrow="Help"
        title="FAQs"
        description="Quick answers about reports, tracking coverage, peers, email delivery, and account data."
      />

      <section className="grid gap-4">
        {
          faqSections.map(
            (section) => (
              <article
                key={section.title}
                className="app-card"
              >
                <h2 className="app-section-title">
                  {section.title}
                </h2>

                <div className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {
                    section.items.map(
                      (item) => (
                        <div
                          key={item.question}
                          className="px-4 py-4"
                        >
                          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
                            {item.question}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {item.answer}
                          </p>
                        </div>
                      )
                    )
                  }
                </div>
              </article>
            )
          )
        }
      </section>
    </main>
  );
}
