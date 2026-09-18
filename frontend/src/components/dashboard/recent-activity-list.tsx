import { Activity } from 'lucide-react';
import Link from 'next/link';

import { formatRelativeTime, statusColorClass } from '@/lib/utils/format';
import { METHOD_COLOR } from '@/lib/utils/method-color';
import type { RecentActivityEntry } from '@/types/dashboard';

export function RecentActivityList({ entries }: { entries: RecentActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-16 text-center">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No requests sent yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface">
      {entries.map((entry) => {
        const inner = (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span
              className={`w-14 shrink-0 font-mono text-xs font-semibold ${METHOD_COLOR[entry.method]}`}
            >
              {entry.method}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">
              {entry.saved_request_name ?? entry.url}
            </span>
            {entry.success ? (
              <span
                className={`w-14 shrink-0 text-right font-mono text-xs font-semibold ${statusColorClass(entry.status_code ?? 0)}`}
              >
                {entry.status_code}
              </span>
            ) : (
              <span className="w-14 shrink-0 text-right text-xs font-semibold text-danger">
                Failed
              </span>
            )}
            <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
              {formatRelativeTime(entry.executed_at)}
            </span>
          </div>
        );

        return (
          <div key={entry.id} className="border-t border-border first:border-t-0">
            {entry.saved_request_id ? (
              <Link
                href={`/workspace/${entry.saved_request_id}`}
                className="block hover:bg-surface-hover"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </div>
        );
      })}
    </div>
  );
}
