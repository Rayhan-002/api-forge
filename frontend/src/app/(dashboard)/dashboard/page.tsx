'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileText, Folder, Globe, History as HistoryIcon, Plus } from 'lucide-react';
import Link from 'next/link';

import { getDashboardSummary } from '@/lib/api/dashboard';
import { useAuthStore } from '@/store/auth-store';
import { useRequestBuilderStore } from '@/store/request-builder-store';
import { RecentActivityList } from '@/components/dashboard/recent-activity-list';
import { StatTile } from '@/components/dashboard/stat-tile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const resetDraft = useRequestBuilderStore((state) => state.resetDraft);

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    // Overrides the app-wide 10s default: activity/counts here should
    // reflect what's true right now, not a stale snapshot from the last
    // time this page happened to be visited within the last 10 seconds.
    staleTime: 0,
  });
  const summary = summaryQuery.data;

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Welcome{user ? `, ${user.email}` : ''}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your collections.
          </p>
        </div>
        <Link href="/workspace" onClick={() => resetDraft()}>
          <Button>
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryQuery.isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[72px]" />)
          : summary && (
              <>
                <StatTile
                  icon={Folder}
                  label="Collections"
                  value={summary.counts.collections}
                  href="/collections"
                />
                <StatTile
                  icon={FileText}
                  label="Saved requests"
                  value={summary.counts.saved_requests}
                  href="/collections"
                />
                <StatTile
                  icon={Globe}
                  label="Environments"
                  value={summary.counts.environments}
                  href="/environments"
                />
                <StatTile
                  icon={HistoryIcon}
                  label="History entries"
                  value={summary.counts.history_entries}
                  href="/history"
                />
              </>
            )}
      </div>

      {!summaryQuery.isLoading && summary && summary.test_summary.total > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-3">
          <CheckCircle2
            className={`h-4 w-4 shrink-0 ${
              summary.test_summary.passed === summary.test_summary.total
                ? 'text-success'
                : 'text-warning'
            }`}
          />
          <p className="text-sm text-foreground">
            <span className="font-semibold">
              {summary.test_summary.passed}/{summary.test_summary.total}
            </span>{' '}
            test assertions passing across your recent executions.
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent activity</h2>
        {summaryQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <RecentActivityList entries={summary?.recent_activity ?? []} />
        )}
      </div>
    </div>
  );
}
