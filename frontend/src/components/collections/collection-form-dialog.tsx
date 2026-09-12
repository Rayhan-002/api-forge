'use client';

import { useState, type FormEvent } from 'react';

import type { CollectionPayload } from '@/types/collections';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';

interface CollectionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CollectionPayload) => void;
  isLoading: boolean;
  initial?: { name: string; description: string };
  title: string;
  submitLabel: string;
}

export function CollectionFormDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  initial,
  title,
  submitLabel,
}: CollectionFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {/* Mounted fresh each time the dialog opens, so its state always
          starts from `initial` rather than whatever was last typed. */}
      <CollectionForm
        onSubmit={onSubmit}
        onClose={onClose}
        isLoading={isLoading}
        initial={initial}
        submitLabel={submitLabel}
      />
    </Dialog>
  );
}

function CollectionForm({
  onSubmit,
  onClose,
  isLoading,
  initial,
  submitLabel,
}: Omit<CollectionFormDialogProps, 'open' | 'title'>) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() });
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
      <Field
        label="Description"
        name="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} disabled={!name.trim()}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
