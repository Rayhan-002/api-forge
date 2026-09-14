'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Move,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { listRequestsInCollection } from '@/lib/api/saved-requests';
import { cn } from '@/lib/utils/cn';
import type { CollectionTreeNode } from '@/lib/utils/collection-tree';
import { METHOD_COLOR } from '@/lib/utils/method-color';
import type { Collection, SavedRequestListItem } from '@/types/collections';

interface NodeActions {
  onRenameCollection: (collection: Collection) => void;
  onMoveCollection: (collection: Collection) => void;
  onDeleteCollection: (collection: Collection) => void;
  onCreateSubfolder: (parent: Collection) => void;
  onRenameRequest: (request: SavedRequestListItem) => void;
  onMoveRequest: (request: SavedRequestListItem) => void;
  onDeleteRequest: (request: SavedRequestListItem) => void;
}

interface CollectionNodeProps extends NodeActions {
  node: CollectionTreeNode;
  depth: number;
}

const INDENT_PX = 20;
const BASE_PADDING_PX = 12;

export function CollectionNode({ node, depth, ...actions }: CollectionNodeProps) {
  const { collection, children } = node;
  const [expanded, setExpanded] = useState(false);

  const requestsQuery = useQuery({
    queryKey: ['collections', collection.id, 'requests'],
    queryFn: () => listRequestsInCollection(collection.id),
    enabled: expanded,
  });
  const requests = requestsQuery.data?.results ?? [];

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: collection.id,
    data: { type: 'collection' },
  });

  const isEmpty =
    expanded && !requestsQuery.isLoading && children.length === 0 && requests.length === 0;

  return (
    <div>
      <div
        ref={setDropRef}
        className={cn(
          'flex items-center gap-2 py-2.5 pr-3 transition-colors',
          isOver ? 'bg-accent/10 ring-1 ring-inset ring-accent' : 'hover:bg-surface-hover',
        )}
        style={{ paddingLeft: depth * INDENT_PX + BASE_PADDING_PX }}
      >
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
          onClick={() => actions.onCreateSubfolder(collection)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          aria-label="New subfolder"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => actions.onMoveCollection(collection)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          aria-label="Move folder"
        >
          <Move className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => actions.onRenameCollection(collection)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          aria-label="Rename collection"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => actions.onDeleteCollection(collection)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-danger"
          aria-label="Delete collection"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="divide-y divide-border border-t border-border">
          {isEmpty && (
            <div
              className="flex items-center gap-2 py-3 text-xs text-muted-foreground"
              style={{ paddingLeft: (depth + 1) * INDENT_PX + BASE_PADDING_PX }}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Empty. Save a request here or add a subfolder.
            </div>
          )}
          {requestsQuery.isLoading && (
            <div
              className="py-3 text-xs text-muted-foreground"
              style={{ paddingLeft: (depth + 1) * INDENT_PX + BASE_PADDING_PX }}
            >
              Loading…
            </div>
          )}
          {children.map((child) => (
            <CollectionNode key={child.collection.id} node={child} depth={depth + 1} {...actions} />
          ))}
          {requests.map((r) => (
            <RequestRow
              key={r.id}
              request={r}
              depth={depth + 1}
              onRename={actions.onRenameRequest}
              onMove={actions.onMoveRequest}
              onDelete={actions.onDeleteRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({
  request,
  depth,
  onRename,
  onMove,
  onDelete,
}: {
  request: SavedRequestListItem;
  depth: number;
  onRename: (request: SavedRequestListItem) => void;
  onMove: (request: SavedRequestListItem) => void;
  onDelete: (request: SavedRequestListItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: request.id,
    data: { type: 'request', request },
  });

  return (
    <div
      ref={setNodeRef}
      className="group flex items-center gap-2 py-2 pr-3 hover:bg-surface-hover"
      style={{ paddingLeft: depth * INDENT_PX + BASE_PADDING_PX, opacity: isDragging ? 0.4 : 1 }}
    >
      <button
        {...listeners}
        {...attributes}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag to move ${request.name}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Link href={`/workspace/${request.id}`} className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={`w-14 shrink-0 font-mono text-xs font-semibold ${METHOD_COLOR[request.method]}`}
        >
          {request.method}
        </span>
        <span className="truncate text-sm text-foreground">{request.name}</span>
      </Link>
      <div className="hidden items-center gap-1 group-hover:flex">
        <button
          onClick={() => onRename(request)}
          className="rounded p-1 text-muted-foreground hover:bg-border hover:text-foreground"
          aria-label="Rename request"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMove(request)}
          className="rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-border hover:text-foreground"
          aria-label="Move request"
        >
          Move
        </button>
        <button
          onClick={() => onDelete(request)}
          className="rounded p-1 text-muted-foreground hover:bg-border hover:text-danger"
          aria-label="Delete request"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
