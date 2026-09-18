'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History as HistoryIcon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { clearHistory, deleteHistoryEntry, listHistory } from '@/lib/api/history';
import { useRequestBuilderStore } from '@/store/request-builder-store';
import type { HistoryEntry } from '@/types/history';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { HistoryRow } from '@/components/history/history-row';
import { Skeleton } from '@/components/ui/skeleton';

type SuccessFilter = 'all' | 'success' | 'failed';

function hasRedactedValue(entry: HistoryEntry): boolean {
  const { headers, auth_config } = entry.request_snapshot;
  if (headers.some((h) => h.value === '••••')) return true;
  if (auth_config && Object.values(auth_config).some((v) => v === '••••')) return true;
  return false;
}

export default function HistoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadFromSnapshot = useRequestBuilderStore((state) => state.loadFromSnapshot);

  const [filter, setFilter] = useState<SuccessFilter>('all');
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HistoryEntry | null>(null);

  const historyQuery = useQuery({
    queryKey: ['history', filter],
    queryFn: () => listHistory(filter === 'all' ? {} : { success: filter === 'success' }),
  });
  const entries = historyQuery.data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHistoryEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      toast.success('History entry deleted.');
      setDeleteTarget(null);
    },
  });

  const clearMutation = useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      toast.success('History cleared.');
      setClearConfirmOpen(false);
    },
  });

  function handleRestore(entry: HistoryEntry) {
    loadFromSnapshot(entry.request_snapshot, null);
    if (hasRedactedValue(entry)) {
      toast.info(
        'Restored — secret values were redacted in history, re-enter them before sending.',
      );
    } else {
      toast.success('Request restored.');
    }
    router.push('/workspace');
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">History</h1>
        {entries.length > 0 && (
          <Button variant="secondary" onClick={() => setClearConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(
          [
            ['all', 'All'],
            ['success', 'Success'],
            ['failed', 'Failed'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              filter === id
                ? 'border-b-2 border-accent text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {historyQuery.isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
      )}

      {!historyQuery.isLoading && entries.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-16 text-center">
          <HistoryIcon className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === 'all' ? 'No requests sent yet.' : `No ${filter} requests yet.`}
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="rounded-md border border-border bg-surface">
          {entries.map((entry) => (
            <HistoryRow
              key={entry.id}
              entry={entry}
              onRestore={handleRestore}
              onDelete={(e) => setDeleteTarget(e)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={() => clearMutation.mutate()}
        isLoading={clearMutation.isPending}
        title="Clear history"
        message="Delete your entire request history? This cannot be undone."
        confirmLabel="Clear All"
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isLoading={deleteMutation.isPending}
        title="Delete history entry"
        message={
          deleteTarget ? `Delete "${deleteTarget.method} ${deleteTarget.url}" from history?` : ''
        }
      />
    </div>
  );
}
