'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { listRequestsInCollection } from '@/lib/api/saved-requests';
import { METHOD_COLOR } from '@/lib/utils/method-color';
import type { Collection, SavedRequestListItem } from '@/types/collections';

interface CollectionRowProps {
  collection: Collection;
  onRenameCollection: (collection: Collection) => void;
  onDeleteCollection: (collection: Collection) => void;
  onRenameRequest: (request: SavedRequestListItem) => void;
  onMoveRequest: (request: SavedRequestListItem) => void;
  onDeleteRequest: (request: SavedRequestListItem) => void;
}

export function CollectionRow({
  collection,
  onRenameCollection,
  onDeleteCollection,
  onRenameRequest,
  onMoveRequest,
  onDeleteRequest,
}: CollectionRowProps) {
  const [expanded, setExpanded] = useState(false);

  const requestsQuery = useQuery({
    queryKey: ['collections', collection.id, 'requests'],
    queryFn: () => listRequestsInCollection(collection.id),
    enabled: expanded,
  });

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {collection.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {collection.request_count} {collection.request_count === 1 ? 'request' : 'requests'}
        </span>
        <button
          onClick={() => onRenameCollection(collection)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          aria-label="Rename collection"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDeleteCollection(collection)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-danger"
          aria-label="Delete collection"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {requestsQuery.isLoading && (
            <div className="px-3 py-3 text-xs text-muted-foreground">Loading…</div>
          )}
          {requestsQuery.data?.results.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
              No saved requests yet. Save one from the workspace.
            </div>
          )}
          {requestsQuery.data?.results.map((r) => (
            <div
              key={r.id}
              className="group flex items-center gap-2 border-t border-border px-3 py-2 first:border-t-0 hover:bg-surface-hover"
            >
              <Link href={`/workspace/${r.id}`} className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={`w-14 shrink-0 font-mono text-xs font-semibold ${METHOD_COLOR[r.method]}`}
                >
                  {r.method}
                </span>
                <span className="truncate text-sm text-foreground">{r.name}</span>
              </Link>
              <div className="hidden items-center gap-1 group-hover:flex">
                <button
                  onClick={() => onRenameRequest(r)}
                  className="rounded p-1 text-muted-foreground hover:bg-border hover:text-foreground"
                  aria-label="Rename request"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onMoveRequest(r)}
                  className="rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-border hover:text-foreground"
                  aria-label="Move request"
                >
                  Move
                </button>
                <button
                  onClick={() => onDeleteRequest(r)}
                  className="rounded p-1 text-muted-foreground hover:bg-border hover:text-danger"
                  aria-label="Delete request"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
