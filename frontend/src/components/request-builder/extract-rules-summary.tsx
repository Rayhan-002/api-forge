'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';

import { listEnvironments } from '@/lib/api/environments';
import { updateSavedRequest } from '@/lib/api/saved-requests';
import type { ExtractRule } from '@/types/collections';

interface ExtractRulesSummaryProps {
  savedRequestId: string;
  rules: ExtractRule[];
}

/** Shows the saved request's current auto-extraction rules, with a way to remove them. */
export function ExtractRulesSummary({ savedRequestId, rules }: ExtractRulesSummaryProps) {
  const queryClient = useQueryClient();
  const environmentsQuery = useQuery({ queryKey: ['environments'], queryFn: listEnvironments });
  const environments = environmentsQuery.data?.results ?? [];

  const deleteMutation = useMutation({
    mutationFn: (variableName: string) =>
      updateSavedRequest(savedRequestId, {
        extract_rules: rules.filter((r) => r.variable_name !== variableName),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', savedRequestId] });
      toast.success('Extraction rule removed.');
    },
  });

  if (rules.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
      <span className="text-xs text-muted-foreground">Extracts:</span>
      {rules.map((rule) => {
        const environmentName =
          environments.find((env) => env.id === rule.target_environment)?.name ?? '?';
        return (
          <span
            key={rule.variable_name}
            className="flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-xs text-foreground"
          >
            <span className="font-mono text-muted-foreground">{rule.source_path}</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="font-mono text-accent">{rule.variable_name}</span>
            <span className="text-muted-foreground">@ {environmentName}</span>
            <button
              onClick={() => deleteMutation.mutate(rule.variable_name)}
              className="ml-0.5 text-muted-foreground hover:text-danger"
              aria-label={`Remove ${rule.variable_name} extraction rule`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
