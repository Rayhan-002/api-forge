'use client';

import { RotateCcw, Trash2 } from 'lucide-react';

import { formatBytes, formatRelativeTime, statusColorClass } from '@/lib/utils/format';
import { METHOD_COLOR } from '@/lib/utils/method-color';
import type { HistoryEntry } from '@/types/history';

interface HistoryRowProps {
  entry: HistoryEntry;
  onRestore: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}

export function HistoryRow({ entry, onRestore, onDelete }: HistoryRowProps) {
  return (
    <div className="group flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0 hover:bg-surface-hover">
      <span
        className={`w-14 shrink-0 font-mono text-xs font-semibold ${METHOD_COLOR[entry.method as keyof typeof METHOD_COLOR] ?? 'text-muted-foreground'}`}
      >
        {entry.method}
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-sm text-foreground">{entry.url}</span>

      {entry.success ? (
        <span
          className={`w-16 shrink-0 font-mono text-xs font-semibold ${statusColorClass(entry.status_code ?? 0)}`}
        >
          {entry.status_code}
        </span>
      ) : (
        <span className="w-16 shrink-0 text-xs font-semibold text-danger">Failed</span>
      )}

      <span className="w-16 shrink-0 text-xs text-muted-foreground">
        {entry.response_time_ms != null ? `${entry.response_time_ms} ms` : '—'}
      </span>
      <span className="w-14 shrink-0 text-xs text-muted-foreground">
        {entry.response_size_bytes != null ? formatBytes(entry.response_size_bytes) : '—'}
      </span>
      <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
        {formatRelativeTime(entry.executed_at)}
      </span>

      <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
        <button
          onClick={() => onRestore(entry)}
          className="rounded p-1 text-muted-foreground hover:bg-border hover:text-foreground"
          aria-label="Restore request"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(entry)}
          className="rounded p-1 text-muted-foreground hover:bg-border hover:text-danger"
          aria-label="Delete history entry"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
