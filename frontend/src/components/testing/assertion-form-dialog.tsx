'use client';

import { useState, type FormEvent } from 'react';

import { describeAssertion } from '@/lib/utils/describe-assertion';
import {
  ASSERTION_TYPES,
  type AssertionConfig,
  type AssertionType,
  type TestAssertion,
  type TestAssertionPayload,
} from '@/types/testing';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';

interface AssertionFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: TestAssertionPayload) => void;
  isLoading: boolean;
  initial?: TestAssertion;
}

export function AssertionFormDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  initial,
}: AssertionFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Edit assertion' : 'New assertion'}>
      <AssertionForm
        onSubmit={onSubmit}
        onClose={onClose}
        isLoading={isLoading}
        initial={initial}
      />
    </Dialog>
  );
}

function coerceJsonValue(raw: string): string | number | boolean {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function AssertionForm({
  onSubmit,
  onClose,
  isLoading,
  initial,
}: Omit<AssertionFormDialogProps, 'open'>) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<AssertionType>(initial?.type ?? 'status_code');
  const [expected, setExpected] = useState(
    initial?.config.expected !== undefined ? String(initial.config.expected) : '',
  );
  const [expectedMs, setExpectedMs] = useState(
    initial?.config.expected_ms !== undefined ? String(initial.config.expected_ms) : '',
  );
  const [headerName, setHeaderName] = useState(initial?.config.header_name ?? '');
  const [path, setPath] = useState(initial?.config.path ?? '');

  function buildConfig(): AssertionConfig {
    switch (type) {
      case 'status_code':
        return { expected: Number(expected) };
      case 'response_time_lt':
        return { expected_ms: Number(expectedMs) };
      case 'header_exists':
        return { header_name: headerName };
      case 'header_equals':
        return { header_name: headerName, expected };
      case 'json_field_exists':
        return { path };
      case 'json_field_equals':
        return { path, expected: coerceJsonValue(expected) };
      case 'body_contains':
        return { expected };
    }
  }

  const config = buildConfig();
  const preview = describeAssertion(type, config);

  function isValid(): boolean {
    switch (type) {
      case 'status_code':
        return expected.trim() !== '';
      case 'response_time_lt':
        return expectedMs.trim() !== '';
      case 'header_exists':
        return headerName.trim() !== '';
      case 'header_equals':
        return headerName.trim() !== '' && expected.trim() !== '';
      case 'json_field_exists':
        return path.trim() !== '';
      case 'json_field_equals':
        return path.trim() !== '' && expected.trim() !== '';
      case 'body_contains':
        return expected.trim() !== '';
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValid()) return;
    onSubmit({ name: name.trim(), type, config: buildConfig() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="assertion-type" className="text-sm font-medium text-foreground">
          Assertion
        </label>
        <select
          id="assertion-type"
          value={type}
          onChange={(e) => setType(e.target.value as AssertionType)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {ASSERTION_TYPES.map(({ value, label }) => (
            <option key={value} value={value} className="bg-surface text-foreground">
              {label}
            </option>
          ))}
        </select>
      </div>

      {type === 'status_code' && (
        <Field
          label="Expected status code"
          name="expected"
          type="number"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="200"
          required
        />
      )}
      {type === 'response_time_lt' && (
        <Field
          label="Expected max time (ms)"
          name="expected_ms"
          type="number"
          value={expectedMs}
          onChange={(e) => setExpectedMs(e.target.value)}
          placeholder="500"
          required
        />
      )}
      {(type === 'header_exists' || type === 'header_equals') && (
        <Field
          label="Header name"
          name="header_name"
          value={headerName}
          onChange={(e) => setHeaderName(e.target.value)}
          placeholder="Content-Type"
          className="font-mono"
          required
        />
      )}
      {type === 'header_equals' && (
        <Field
          label="Expected value"
          name="expected"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="application/json"
          className="font-mono"
          required
        />
      )}
      {(type === 'json_field_exists' || type === 'json_field_equals') && (
        <Field
          label="JSON path"
          name="path"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="user.id"
          className="font-mono"
          required
        />
      )}
      {type === 'json_field_equals' && (
        <Field
          label="Expected value"
          name="expected"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="42"
          className="font-mono"
          required
          hint="Numbers/true/false are compared as JSON values; anything else as text."
        />
      )}
      {type === 'body_contains' && (
        <Field
          label="Expected substring"
          name="expected"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          className="font-mono"
          required
        />
      )}

      <Field
        label="Name (optional)"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={preview}
      />

      <p className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-muted-foreground">
        {preview}
      </p>

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} disabled={!isValid()}>
          Save
        </Button>
      </div>
    </form>
  );
}
