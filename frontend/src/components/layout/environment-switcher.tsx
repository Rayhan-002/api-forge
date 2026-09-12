'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe } from 'lucide-react';

import {
  activateEnvironment,
  deactivateEnvironment,
  listEnvironments,
} from '@/lib/api/environments';

/** Sets which environment's variables resolve {{placeholders}} on Send. */
export function EnvironmentSwitcher() {
  const queryClient = useQueryClient();
  const environmentsQuery = useQuery({ queryKey: ['environments'], queryFn: listEnvironments });
  const environments = environmentsQuery.data?.results ?? [];
  const active = environments.find((env) => env.is_active);

  const switchMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (id) {
        await activateEnvironment(id);
      } else {
        await deactivateEnvironment();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['environments'] }),
  });

  if (environments.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      <select
        value={active?.id ?? ''}
        onChange={(e) => switchMutation.mutate(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
        aria-label="Active environment"
      >
        <option value="" className="bg-surface text-foreground">
          No environment
        </option>
        {environments.map((env) => (
          <option key={env.id} value={env.id} className="bg-surface text-foreground">
            {env.name}
          </option>
        ))}
      </select>
    </div>
  );
}
