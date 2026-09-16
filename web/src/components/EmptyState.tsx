"use client";

import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function EmptyState({
  title,
  description,
  actionHref,
  actionLabel
}: EmptyStateProps) {
  return (
    <div className="app-card-muted text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
        <Sprout aria-hidden="true" className="size-6" />
      </div>

      <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>

      {
        actionHref &&
        actionLabel && (
          <Link
            href={actionHref}
            className="app-button-primary mt-4 inline-flex no-underline"
          >
            {actionLabel}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )
      }
    </div>
  );
}
