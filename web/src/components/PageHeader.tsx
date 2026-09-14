import Link from "next/link";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  action
}: PageHeaderProps) {
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {
          backHref && (
            <Link
              href={backHref}
              className="text-sm"
            >
              {backLabel ?? "Back"}
            </Link>
          )
        }

        {
          eyebrow && (
            <p
              className={
                [
                  "text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300",
                  backHref
                    ? "mt-4"
                    : ""
                ].join(
                  " "
                )
              }
            >
              {eyebrow}
            </p>
          )
        }

        <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950 dark:text-white">
          {title}
        </h1>

        {
          description && (
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )
        }
      </div>

      {
        action && (
          <div className="shrink-0">
            {action}
          </div>
        )
      }
    </section>
  );
}
