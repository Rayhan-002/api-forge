'use client';

import { useState } from 'react';

import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import type { ExecuteResponse } from '@/types/request';
import { ResponseBodyViewer } from '@/components/response-viewer/response-body-viewer';
import { ResponseErrorState } from '@/components/response-viewer/response-error-state';
import { ResponseHeadersTable } from '@/components/response-viewer/response-headers-table';
import { ResponseStatusBar } from '@/components/response-viewer/response-status-bar';

type Tab = 'body' | 'headers';

interface ResponsePanelProps {
  result: ExecuteResponse | undefined;
  error: unknown;
  isLoading: boolean;
}

export function ResponsePanel({ result, error, isLoading }: ResponsePanelProps) {
  const [tab, setTab] = useState<Tab>('body');

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Sending…</div>;
  }

  if (error) {
    const message = error instanceof ApiError ? error.message : 'Could not reach the server.';
    return <ResponseErrorState errorType="request_error" errorMessage={message} />;
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Send a request to see the response here.
      </div>
    );
  }

  if (!result.success) {
    return <ResponseErrorState errorType={result.error_type} errorMessage={result.error_message} />;
  }

  const headerCount = Object.keys(result.headers).length;

  return (
    <div className="flex h-full flex-col">
      <ResponseStatusBar
        statusCode={result.status_code}
        reasonPhrase={result.reason_phrase}
        elapsedMs={result.elapsed_ms}
        sizeBytes={result.size_bytes}
      />
      <div className="flex shrink-0 gap-1 border-b border-border px-4">
        {(
          [
            ['body', 'Body'],
            ['headers', `Headers (${headerCount})`],
          ] as const
        ).map(([id, label]) => (
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
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'body' && <ResponseBodyViewer body={result.body} />}
        {tab === 'headers' && <ResponseHeadersTable headers={result.headers} />}
      </div>
    </div>
  );
}
