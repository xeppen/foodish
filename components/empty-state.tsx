import Link from "next/link";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-[var(--cream-dark)] flex items-center justify-center mb-6">
        <svg
          className="h-10 w-10 text-[var(--warm-gray)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-[var(--charcoal)] mb-2">{title}</h3>
      <p className="text-[var(--warm-gray)] max-w-sm mx-auto">{description}</p>
      {action && (
        <div className="mt-8">
          <Link href={action.href} className="btn-primary inline-flex items-center gap-2">
            {action.label}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
