'use client';

import { json } from '@codemirror/lang-json';
import CodeMirror from '@uiw/react-codemirror';
import { useState } from 'react';

import { useRequestBuilderStore } from '@/store/request-builder-store';
import type { BodyType } from '@/types/request';
import { Button } from '@/components/ui/button';
import { KeyValueEditor } from '@/components/request-builder/key-value-editor';

const BODY_TYPES: Array<{ value: BodyType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'Raw' },
  { value: 'form-urlencoded', label: 'Form URL Encoded' },
  { value: 'multipart', label: 'Multipart' },
];

export function BodyEditor() {
  const { bodyType, setBodyType, rawBody, setRawBody, formBody, setFormBody } =
    useRequestBuilderStore();
  const [jsonError, setJsonError] = useState<string | null>(null);

  function formatJson() {
    try {
      const parsed = JSON.parse(rawBody || '{}');
      setRawBody(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON.');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {BODY_TYPES.map(({ value, label }) => (
          <label key={value} className="flex items-center gap-1.5 text-sm text-foreground">
            <input
              type="radio"
              name="body-type"
              checked={bodyType === value}
              onChange={() => setBodyType(value)}
              className="accent-accent"
            />
            {label}
          </label>
        ))}
        {bodyType === 'json' && (
          <Button variant="secondary" onClick={formatJson} className="ml-auto py-1 text-xs">
            Format
          </Button>
        )}
      </div>

      {bodyType === 'none' && (
        <p className="text-sm text-muted-foreground">This request does not have a body.</p>
      )}

      {bodyType === 'json' && (
        <div className="flex flex-col gap-1.5">
          <div className="overflow-hidden rounded-md border border-border">
            <CodeMirror
              value={rawBody}
              height="240px"
              theme="dark"
              extensions={[json()]}
              onChange={(value) => setRawBody(value)}
              basicSetup={{ foldGutter: true, lineNumbers: true }}
            />
          </div>
          {jsonError && <p className="text-xs text-danger">{jsonError}</p>}
        </div>
      )}

      {bodyType === 'raw' && (
        <textarea
          value={rawBody}
          onChange={(e) => setRawBody(e.target.value)}
          rows={10}
          placeholder="Raw request body"
          className="rounded-md border border-border bg-surface p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
      )}

      {(bodyType === 'form-urlencoded' || bodyType === 'multipart') && (
        <KeyValueEditor rows={formBody} onChange={setFormBody} />
      )}
    </div>
  );
}
