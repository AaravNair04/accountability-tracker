import PeerReportsPageContent from "@/app/reports/PeerReportsPageContent";

export default async function InboxPage() {
  return (
    <PeerReportsPageContent
      backHref="/"
      backLabel="← Back to Dashboard"
    />
  );
}
