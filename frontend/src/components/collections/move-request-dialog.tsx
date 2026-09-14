'use client';

import { useState, type FormEvent } from 'react';

import { buildCollectionPathLabels } from '@/lib/utils/collection-tree';
import type { Collection } from '@/types/collections';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';

interface MoveRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (targetCollectionId: string) => void;
  isLoading: boolean;
  collections: Collection[];
  currentCollectionId: string;
}

export function MoveRequestDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  collections,
  currentCollectionId,
}: MoveRequestDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Move request">
      <MoveForm
        onSubmit={onSubmit}
        onClose={onClose}
        isLoading={isLoading}
        collections={collections}
        currentCollectionId={currentCollectionId}
      />
    </Dialog>
  );
}

function MoveForm({
  onSubmit,
  onClose,
  isLoading,
  collections,
  currentCollectionId,
}: Omit<MoveRequestDialogProps, 'open'>) {
  const options = collections.filter((c) => c.id !== currentCollectionId);
  const pathLabels = buildCollectionPathLabels(collections);
  const [target, setTarget] = useState(options[0]?.id ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    onSubmit(target);
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You don&apos;t have any other collections to move this request into.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="move-target" className="text-sm font-medium text-foreground">
          Destination collection
        </label>
        <select
          id="move-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
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
