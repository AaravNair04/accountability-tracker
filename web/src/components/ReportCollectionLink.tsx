import Link from "next/link";
import { ArrowUpRight, BookOpen, Users } from "lucide-react";

type ReportCollectionLinkProps = {
  kind: "my" | "peers";
  count: number;
  unreadCount?: number;
};

export default function ReportCollectionLink({ kind, count, unreadCount = 0 }: ReportCollectionLinkProps) {
  const isPeers = kind === "peers";
  const Icon = isPeers ? Users : BookOpen;

  return (
    <Link href={`/reports/${kind}`} className="report-choice group" data-kind={kind}>
      <div className="flex items-center justify-between gap-3">
        <span className="report-choice-icon"><Icon aria-hidden="true" className="size-6" /></span>
        <ArrowUpRight aria-hidden="true" className="size-5 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{isPeers ? "My Peers' Reports" : "My Reports"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {isPeers ? "Reports from people you are keeping accountable." : "Your daily activity, tracking coverage, and peer responses."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400"><span className="mr-1 text-2xl font-semibold text-slate-950 tabular-nums dark:text-white">{count}</span> report{count === 1 ? "" : "s"}</p>
        {isPeers && unreadCount > 0 && <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"><span aria-hidden="true" className="size-1.5 rounded-full bg-sky-500" />{unreadCount} unread</span>}
      </div>
    </Link>
  );
}
