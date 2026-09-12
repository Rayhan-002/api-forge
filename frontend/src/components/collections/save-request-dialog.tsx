'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { listCollections } from '@/lib/api/collections';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';

interface SaveRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; collectionId: string }) => void;
  isLoading: boolean;
  defaultName?: string;
}

export function SaveRequestDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  defaultName = 'New Request',
}: SaveRequestDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Save request">
      <SaveForm
        onSubmit={onSubmit}
        onClose={onClose}
        isLoading={isLoading}
        defaultName={defaultName}
      />
    </Dialog>
  );
}

function SaveForm({
  onSubmit,
  onClose,
  isLoading,
  defaultName,
}: Omit<SaveRequestDialogProps, 'open'> & { defaultName: string }) {
  const collectionsQuery = useQuery({ queryKey: ['collections'], queryFn: listCollections });
  const collections = collectionsQuery.data?.results ?? [];
  const [name, setName] = useState(defaultName);
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const finalCollectionId = collectionId || collections[0]?.id;
    if (!name.trim() || !finalCollectionId) return;
    onSubmit({ name: name.trim(), collectionId: finalCollectionId });
  }

  if (collectionsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading collections…</p>;
  }

  if (collections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You need a collection first.{' '}
        <Link href="/collections" className="text-accent hover:text-accent-hover">
          Create one
        </Link>{' '}
        then come back.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="Name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="save-collection" className="text-sm font-medium text-foreground">
          Collection
        </label>
        <select
          id="save-collection"
          value={collectionId || collections[0].id}
          onChange={(e) => setCollectionId(e.target.value)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {collections.map((c) => (
            <option key={c.id} value={c.id} className="bg-surface text-foreground">
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} disabled={!name.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}
