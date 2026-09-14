'use client';

import { useState, type FormEvent } from 'react';

import { buildCollectionPathLabels, getDescendantIds } from '@/lib/utils/collection-tree';
import type { Collection } from '@/types/collections';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

const TOP_LEVEL = '__top-level__';

interface MoveCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (targetParentId: string | null) => void;
  isLoading: boolean;
  collections: Collection[];
  collection?: Collection;
}

export function MoveCollectionDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  collections,
  collection,
}: MoveCollectionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={collection ? `Move "${collection.name}"` : 'Move folder'}
    >
      {collection && (
        <MoveForm
          onSubmit={onSubmit}
          onClose={onClose}
          isLoading={isLoading}
          collections={collections}
          collection={collection}
        />
      )}
    </Dialog>
  );
}

function MoveForm({
  onSubmit,
  onClose,
  isLoading,
  collections,
  collection,
}: Omit<MoveCollectionDialogProps, 'open' | 'collection'> & { collection: Collection }) {
  // Can't move into itself or into one of its own subfolders — that would
  // create a cycle, which the backend also rejects; filtering it out here
  // just avoids offering a choice that's guaranteed to fail.
  const descendantIds = getDescendantIds(collections, collection.id);
  const pathLabels = buildCollectionPathLabels(collections);
  const options = collections.filter((c) => c.id !== collection.id && !descendantIds.has(c.id));

  const [target, setTarget] = useState(collection.parent ?? TOP_LEVEL);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(target === TOP_LEVEL ? null : target);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="move-collection-target" className="text-sm font-medium text-foreground">
          Destination
        </label>
        <select
          id="move-collection-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          <option value={TOP_LEVEL} className="bg-surface text-foreground">
            Top level
          </option>
          {options.map((c) => (
            <option key={c.id} value={c.id} className="bg-surface text-foreground">
              {pathLabels.get(c.id) ?? c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Move
        </Button>
      </div>
    </form>
  );
}
