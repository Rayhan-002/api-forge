'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';

interface EnvironmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  isLoading: boolean;
  initialName?: string;
  title: string;
  submitLabel: string;
}

export function EnvironmentFormDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  initialName,
  title,
  submitLabel,
}: EnvironmentFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <EnvironmentForm
        onSubmit={onSubmit}
        onClose={onClose}
        isLoading={isLoading}
        initialName={initialName}
        submitLabel={submitLabel}
      />
    </Dialog>
  );
}

function EnvironmentForm({
  onSubmit,
  onClose,
  isLoading,
  initialName,
  submitLabel,
}: Omit<EnvironmentFormDialogProps, 'open' | 'title'>) {
  const [name, setName] = useState(initialName ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
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
