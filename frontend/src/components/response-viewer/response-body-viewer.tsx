'use client';

import { Braces, Check, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import type { ExtractRule } from '@/types/collections';
import { ExtractVariableDialog } from '@/components/response-viewer/extract-variable-dialog';
import { JsonTree, type JsonValue } from '@/components/response-viewer/json-tree';

type ViewMode = 'pretty' | 'raw';

interface ResponseBodyViewerProps {
  body: string;
  /** Only offered when viewing a saved request — chaining is tied to its identity. */
  savedRequestId?: string;
  extractRules?: ExtractRule[];
}

export function ResponseBodyViewer({
  body,
  savedRequestId,
  extractRules = [],
}: ResponseBodyViewerProps) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<ViewMode>('pretty');
  const [extractOpen, setExtractOpen] = useState(false);

  const parsed = useMemo<JsonValue | undefined>(() => {
    try {
      return JSON.parse(body) as JsonValue;
    } catch {
      return undefined;
    }
  }, [body]);
  const isJson = parsed !== undefined;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; not worth surfacing an error for.
    }
  }

  if (!body) {
    return <div className="p-4 text-sm text-muted-foreground">(empty body)</div>;
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-1">
        {isJson && (
          <div className="flex gap-1">
            {(['pretty', 'raw'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium capitalize',
                  view === mode
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
        {isJson && savedRequestId && (
          <button
            onClick={() => setExtractOpen(true)}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <Braces className="h-3.5 w-3.5" />
            Extract
          </button>
        )}
        <button
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="max-h-[480px] overflow-auto rounded-md border border-border bg-surface p-3">
        {isJson && view === 'pretty' ? (
          <JsonTree data={parsed} />
        ) : (
          <pre className="whitespace-pre-wrap break-all font-mono text-xs text-foreground">
            {isJson ? JSON.stringify(parsed, null, 2) : body}
          </pre>
        )}
      </div>

      {isJson && savedRequestId && (
        <ExtractVariableDialog
          open={extractOpen}
          onClose={() => setExtractOpen(false)}
          savedRequestId={savedRequestId}
          existingRules={extractRules}
          responseData={parsed}
        />
      )}
    </div>
  );
}
