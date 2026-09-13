import { CheckCircle2, XCircle } from 'lucide-react';

import type { TestResultOutcome } from '@/types/testing';

export function TestResultsTab({ results }: { results: TestResultOutcome[] }) {
  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-xs text-muted-foreground">
        {passedCount}/{results.length} passed
      </p>
      {results.map((result) => (
        <div
          key={result.assertion_id}
          className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2"
        >
          {result.passed ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          )}
          <div className="min-w-0 flex-1">
            <p className={`font-mono text-sm ${result.passed ? 'text-success' : 'text-danger'}`}>
              {result.name}
            </p>
            <p className="text-xs text-muted-foreground">{result.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
