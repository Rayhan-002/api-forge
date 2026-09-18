'use client';

import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { useRequestBuilderStore } from '@/store/request-builder-store';
import { Button } from '@/components/ui/button';
import { AuthEditor } from '@/components/request-builder/auth-editor';
import { BodyEditor } from '@/components/request-builder/body-editor';
import { KeyValueEditor } from '@/components/request-builder/key-value-editor';
import { MethodSelect } from '@/components/request-builder/method-select';
import { AssertionsTab } from '@/components/testing/assertions-tab';

type Tab = 'params' | 'headers' | 'auth' | 'body' | 'tests';

const BASE_TABS: Array<{ id: Tab; label: string }> = [
  { id: 'params', label: 'Params' },
  { id: 'headers', label: 'Headers' },
  { id: 'auth', label: 'Auth' },
  { id: 'body', label: 'Body' },
];

interface RequestBuilderProps {
  onSend: () => void;
  isSending: boolean;
  requestName?: string;
  onSave?: () => void;
  isSaving?: boolean;
  /** Only saved requests can have assertions — shows a Tests tab when provided. */
  savedRequestId?: string;
}

export function RequestBuilder({
  onSend,
  isSending,
  requestName,
  onSave,
  isSaving,
  savedRequestId,
}: RequestBuilderProps) {
  const [tab, setTab] = useState<Tab>('params');
  const { method, setMethod, url, setUrl, params, setParams, headers, setHeaders } =
    useRequestBuilderStore();

  const tabs = savedRequestId
    ? [...BASE_TABS, { id: 'tests' as const, label: 'Tests' }]
    : BASE_TABS;

  function handleSend() {
    if (!url.trim() || isSending) return;
    onSend();
  }

  // Ctrl/Cmd+Enter sends from anywhere in the builder — params, headers,
  // body editor, wherever focus happens to be — not just the URL bar.
  // Skipped while a dialog is open (e.g. editing an assertion) so it
  // doesn't hijack Enter from a dialog's own form.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]')) return;
      e.preventDefault();
      if (!url.trim() || isSending) return;
      onSend();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [url, isSending, onSend]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {requestName && <p className="text-sm font-medium text-foreground">{requestName}</p>}
      <div className="flex items-center gap-2">
        <MethodSelect value={method} onChange={setMethod} />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/users"
          className="h-10 flex-1 rounded-md border border-border bg-surface px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
        {onSave && (
          <Button variant="secondary" onClick={onSave} isLoading={isSaving} className="h-10">
            <Save className="h-4 w-4" />
            Save
          </Button>
        )}
        <Button onClick={handleSend} isLoading={isSending} disabled={!url.trim()} className="h-10">
          {isSending ? 'Sending…' : 'Send'}
        </Button>
      </div>

      <div>
        <div className="flex gap-1 border-b border-border">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                tab === id
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pt-4">
          {tab === 'params' && <KeyValueEditor rows={params} onChange={setParams} />}
          {tab === 'headers' && <KeyValueEditor rows={headers} onChange={setHeaders} />}
          {tab === 'auth' && <AuthEditor />}
          {tab === 'body' && <BodyEditor />}
          {tab === 'tests' && savedRequestId && <AssertionsTab savedRequestId={savedRequestId} />}
        </div>
      </div>
    </div>
  );
}
