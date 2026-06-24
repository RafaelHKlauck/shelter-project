import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function LocationWarning({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-900">
      <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-600" />
      <div className="flex-1">
        <p className="text-sm">{message}</p>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="mt-1 inline-block text-sm font-medium text-yellow-900 underline hover:text-yellow-700"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
