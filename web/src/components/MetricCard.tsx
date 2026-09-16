import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: "teal" | "rose" | "amber" | "blue";
};

export default function MetricCard({ label, value, detail, icon: Icon, tone }: MetricCardProps) {
  return (
    <div className="metric-card" data-tone={tone}>
      <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400">
        <p className="text-xs font-semibold">{label}</p>
        <Icon aria-hidden="true" className="size-4 shrink-0" />
      </div>
      <p className="mt-4 text-2xl font-semibold text-slate-950 tabular-nums dark:text-white">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}
