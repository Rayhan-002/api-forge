'use client';

import { ApiError } from '@/lib/api/client';
import type { ExecuteResponse } from '@/types/request';

function statusColor(status: number): string {
  if (status < 300) return 'text-success';
  if (status < 400) return 'text-info';
  if (status < 500) return 'text-warning';
  return 'text-danger';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ERROR_TYPE_LABEL: Record<string, string> = {
  timeout: 'Timed out',
  dns_error: 'DNS lookup failed',
  connection_error: 'Connection failed',
  invalid_url: 'Invalid URL',
  ssrf_blocked: 'Blocked (unsafe target)',
  too_many_redirects: 'Too many redirects',
  response_too_large: 'Response too large',
  invalid_body_type: 'Invalid body',
  invalid_auth_type: 'Invalid auth',
  request_error: 'Request failed',
};

interface ResponsePanelProps {
  result: ExecuteResponse | undefined;
  error: unknown;
  isLoading: boolean;
}

/**
 * Deliberately minimal for Phase 2 — proves the execute pipeline works
 * end to end. The full response viewer (JSON tree, headers table, copy
 * button, raw/pretty toggle) is built in Phase 3.
 */
export function ResponsePanel({ result, error, isLoading }: ResponsePanelProps) {
  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Sending…</div>;
  }

  if (error) {
    const message = error instanceof ApiError ? error.message : 'Could not reach the server.';
    return (
      <div className="p-6">
        <p className="text-sm font-medium text-danger">Request failed</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Send a request to see the response here.
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="p-6">
        <p className="text-sm font-medium text-danger">
          {ERROR_TYPE_LABEL[result.error_type] ?? 'Request failed'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{result.error_message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-4 text-sm">
        <span className={`font-mono font-semibold ${statusColor(result.status_code)}`}>
          {result.status_code} {result.reason_phrase}
        </span>
        <span className="text-muted-foreground">{result.elapsed_ms} ms</span>
        <span className="text-muted-foreground">{formatBytes(result.size_bytes)}</span>
      </div>

      <pre className="max-h-[480px] overflow-auto rounded-md border border-border bg-surface p-3 font-mono text-xs text-foreground">
        {result.body || '(empty body)'}
      </pre>
    </div>
  );
}
