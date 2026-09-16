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
    <section className="page-header">
      <div className="min-w-0">
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
                  "text-xs font-semibold text-indigo-600 dark:text-indigo-300",
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

        <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl dark:text-white">
          {title}
        </h1>

        {
          description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )
        }
      </div>

      {
        action && (
          <div className="flex flex-wrap gap-2 sm:max-w-xs sm:shrink-0">
            {action}
          </div>
        )
      }
    </section>
  );
}
