'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { useRequestBuilderStore } from '@/store/request-builder-store';
import { Button } from '@/components/ui/button';
import { AuthEditor } from '@/components/request-builder/auth-editor';
import { BodyEditor } from '@/components/request-builder/body-editor';
import { KeyValueEditor } from '@/components/request-builder/key-value-editor';
import { MethodSelect } from '@/components/request-builder/method-select';

type Tab = 'params' | 'headers' | 'auth' | 'body';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'params', label: 'Params' },
  { id: 'headers', label: 'Headers' },
  { id: 'auth', label: 'Auth' },
  { id: 'body', label: 'Body' },
];

export function RequestBuilder({ onSend, isSending }: { onSend: () => void; isSending: boolean }) {
  const [tab, setTab] = useState<Tab>('params');
  const { method, setMethod, url, setUrl, params, setParams, headers, setHeaders } =
    useRequestBuilderStore();

  function handleSend() {
    if (!url.trim() || isSending) return;
    onSend();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <MethodSelect value={method} onChange={setMethod} />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSend();
          }}
          placeholder="https://api.example.com/users"
          className="h-10 flex-1 rounded-md border border-border bg-surface px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
        />
        <Button onClick={handleSend} isLoading={isSending} disabled={!url.trim()} className="h-10">
          {isSending ? 'Sending…' : 'Send'}
        </Button>
      </div>

      <div>
        <div className="flex gap-1 border-b border-border">
          {TABS.map(({ id, label }) => (
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
        </div>
      </div>
    </div>
  );
}
