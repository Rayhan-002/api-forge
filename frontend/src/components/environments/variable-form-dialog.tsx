'use client';

import { useState, type FormEvent } from 'react';

import type { EnvironmentVariable, VariablePayload } from '@/types/environments';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';

interface VariableFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: VariablePayload) => void;
  isLoading: boolean;
  initial?: EnvironmentVariable;
}

export function VariableFormDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  initial,
}: VariableFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Edit variable' : 'New variable'}>
      <VariableForm onSubmit={onSubmit} onClose={onClose} isLoading={isLoading} initial={initial} />
    </Dialog>
  );
}

function VariableForm({
  onSubmit,
  onClose,
  isLoading,
  initial,
}: Omit<VariableFormDialogProps, 'open'>) {
  const [key, setKey] = useState(initial?.key ?? '');
  const [value, setValue] = useState(initial?.is_secret ? '' : (initial?.value ?? ''));
  const [valueTouched, setValueTouched] = useState(false);
  const [isSecret, setIsSecret] = useState(initial?.is_secret ?? false);
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!key.trim()) return;

    const payload: VariablePayload = { key: key.trim(), is_secret: isSecret, enabled };
    if (!initial || !isSecret || valueTouched) {
      payload.value = value;
    }
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="Key"
        name="key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="base_url"
        className="font-mono"
        autoFocus
        required
      />
      <Field
        label="Value"
        name="value"
        type={isSecret ? 'password' : 'text'}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setValueTouched(true);
        }}
        placeholder={initial?.is_secret ? 'Leave blank to keep the current value' : undefined}
        className="font-mono"
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isSecret}
            onChange={(e) => setIsSecret(e.target.checked)}
            className="accent-accent"
          />
          Secret
        </label>
        <label className="flex items-center gap-1.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-accent"
          />
          Enabled
        </label>
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} disabled={!key.trim()}>
          Save
        </Button>
      </div>
    </form>
  );
}
