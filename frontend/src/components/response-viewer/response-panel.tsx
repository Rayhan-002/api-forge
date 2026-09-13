'use client';

import { useState } from 'react';

import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import type { ExtractRule } from '@/types/collections';
import type { ExecuteResponse } from '@/types/request';
import { ResponseBodyViewer } from '@/components/response-viewer/response-body-viewer';
import { ResponseErrorState } from '@/components/response-viewer/response-error-state';
import { ResponseHeadersTable } from '@/components/response-viewer/response-headers-table';
import { ResponseStatusBar } from '@/components/response-viewer/response-status-bar';
import { TestResultsTab } from '@/components/response-viewer/test-results-tab';

type Tab = 'body' | 'headers' | 'tests';

interface ResponsePanelProps {
  result: ExecuteResponse | undefined;
  error: unknown;
  isLoading: boolean;
  savedRequestId?: string;
  extractRules?: ExtractRule[];
}

export function ResponsePanel({
  result,
  error,
  isLoading,
  savedRequestId,
  extractRules,
}: ResponsePanelProps) {
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
  const testResults = result.test_results ?? [];

  const tabs: Array<[Tab, string]> = [
    ['body', 'Body'],
    ['headers', `Headers (${headerCount})`],
  ];
  if (testResults.length > 0) {
    const passedCount = testResults.filter((r) => r.passed).length;
    tabs.push(['tests', `Tests (${passedCount}/${testResults.length})`]);
  }

  return (
    <div className="flex h-full flex-col">
      <ResponseStatusBar
        statusCode={result.status_code}
        reasonPhrase={result.reason_phrase}
        elapsedMs={result.elapsed_ms}
        sizeBytes={result.size_bytes}
      />
      <div className="flex shrink-0 gap-1 border-b border-border px-4">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'border-b-2 border-accent text-accent'
                : id === 'tests' && testResults.some((r) => !r.passed)
                  ? 'text-danger hover:text-danger'
                  : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === 'body' && (
          <ResponseBodyViewer
            body={result.body}
            savedRequestId={savedRequestId}
            extractRules={extractRules}
          />
        )}
        {tab === 'headers' && <ResponseHeadersTable headers={result.headers} />}
        {tab === 'tests' && <TestResultsTab results={testResults} />}
      </div>
    </div>
  );
}
