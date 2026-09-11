'use client';

import { X } from 'lucide-react';

import { newRow } from '@/store/request-builder-store';
import type { KeyValueRow } from '@/types/request';

interface KeyValueEditorProps {
  rows: KeyValueRow[];
  onChange: (rows: KeyValueRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

/** Params/headers/form-body editor: add-on-type, always one trailing blank row. */
export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  function withTrailingBlankRow(next: KeyValueRow[]): KeyValueRow[] {
    if (next.length === 0) return [newRow()];
    const last = next[next.length - 1];
    if (last.key !== '' || last.value !== '') return [...next, newRow()];
    return next;
  }

  function updateRow(id: string, patch: Partial<KeyValueRow>) {
    const next = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
    onChange(withTrailingBlankRow(next));
  }

  function removeRow(id: string) {
    const next = rows.filter((row) => row.id !== id);
    onChange(withTrailingBlankRow(next));
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => updateRow(row.id, { enabled: e.target.checked })}
            className="h-4 w-4 shrink-0 accent-accent"
            aria-label="Enabled"
          />
          <input
            type="text"
            value={row.key}
            onChange={(e) => updateRow(row.id, { key: e.target.value })}
            placeholder={keyPlaceholder}
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            value={row.value}
            onChange={(e) => updateRow(row.id, { value: e.target.value })}
            placeholder={valuePlaceholder}
            className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-danger"
            aria-label="Remove row"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
