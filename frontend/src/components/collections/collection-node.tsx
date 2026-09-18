'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderPlus,
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

// Buttons nested inside a draggable row must not let their clicks be
// swallowed by drag detection — stopping propagation here means dnd-kit's
// sensor never starts "watching" a pointerdown that began on one of them.
function stopForDrag(e: React.PointerEvent) {
  e.stopPropagation();
}

export function CollectionNode({ node, depth, ...actions }: CollectionNodeProps) {
  const { collection, children } = node;
  const [expanded, setExpanded] = useState(false);

  const requestsQuery = useQuery({
    queryKey: ['collections', collection.id, 'requests'],
    queryFn: () => listRequestsInCollection(collection.id),
    enabled: expanded,
  });
  const requests = requestsQuery.data?.results ?? [];

  // Droppable covers this folder's whole subtree — header row AND its
  // expanded content — so dropping on any of its requests (not just its
  // name row) still counts as "move into this folder." A nested subfolder
  // renders its own (smaller) droppable on top of this one; DndContext uses
  // pointerWithin collision detection so the innermost match under the
  // pointer wins, meaning a drop precisely on a subfolder still targets
  // that subfolder rather than this outer one.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: collection.id,
    data: { type: 'collection' },
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: collection.id,
    data: { type: 'collection', collection },
  });

  const isEmpty =
    expanded && !requestsQuery.isLoading && children.length === 0 && requests.length === 0;

  return (
    <div
      ref={setDropRef}
      className={cn(isOver && 'bg-accent/5 outline -outline-offset-1 outline-accent')}
    >
      <div
        ref={setDragRef}
        {...listeners}
        {...attributes}
        className={cn(
          'flex cursor-grab items-center gap-2 py-2.5 pr-3 transition-colors hover:bg-surface-hover active:cursor-grabbing',
          isDragging && 'opacity-40',
        )}
        style={{ paddingLeft: depth * INDENT_PX + BASE_PADDING_PX }}
        title="Drag to move this folder into another collection or folder"
      >
        <button
          onClick={() => setExpanded((e) => !e)}
          onPointerDown={stopForDrag}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
          title={expanded ? 'Collapse this folder' : 'Expand this folder'}
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
          onPointerDown={stopForDrag}
          className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          title="Add a subfolder inside this collection"
          aria-label="New subfolder"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => actions.onMoveCollection(collection)}
          onPointerDown={stopForDrag}
          className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          title="Move this folder to a different collection (or drag it directly)"
          aria-label="Move folder"
        >
          <Move className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => actions.onRenameCollection(collection)}
          onPointerDown={stopForDrag}
          className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          title="Rename this collection"
          aria-label="Rename collection"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => actions.onDeleteCollection(collection)}
          onPointerDown={stopForDrag}
          className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-danger"
          title="Delete this collection"
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
      {...listeners}
      {...attributes}
      className={cn(
        'group flex cursor-grab items-center gap-2 py-2 pr-3 hover:bg-surface-hover active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      style={{ paddingLeft: depth * INDENT_PX + BASE_PADDING_PX }}
      title="Drag to move this request into another folder or collection"
    >
      <Link
        href={`/workspace/${request.id}`}
        className="flex min-w-0 flex-1 items-center gap-2"
        title={`Open "${request.name}" in the workspace`}
      >
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
          onPointerDown={stopForDrag}
          className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-border hover:text-foreground"
          title="Rename this request"
          aria-label="Rename request"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMove(request)}
          onPointerDown={stopForDrag}
          className="cursor-pointer rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-border hover:text-foreground"
          title="Move this request to a different collection or folder"
          aria-label="Move request"
        >
          Move
        </button>
        <button
          onClick={() => onDelete(request)}
          onPointerDown={stopForDrag}
          className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-border hover:text-danger"
          title="Delete this request"
          aria-label="Delete request"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
