'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { listVariables } from '@/lib/api/environments';
import type { Environment, EnvironmentVariable } from '@/types/environments';
import { Button } from '@/components/ui/button';

interface EnvironmentRowProps {
  environment: Environment;
  onActivate: (environment: Environment) => void;
  onRename: (environment: Environment) => void;
  onDelete: (environment: Environment) => void;
  onAddVariable: (environment: Environment) => void;
  onEditVariable: (environment: Environment, variable: EnvironmentVariable) => void;
  onDeleteVariable: (environment: Environment, variable: EnvironmentVariable) => void;
}

export function EnvironmentRow({
  environment,
  onActivate,
  onRename,
  onDelete,
  onAddVariable,
  onEditVariable,
  onDeleteVariable,
}: EnvironmentRowProps) {
  const [expanded, setExpanded] = useState(false);

  const variablesQuery = useQuery({
    queryKey: ['environments', environment.id, 'variables'],
    queryFn: () => listVariables(environment.id),
    enabled: expanded,
  });

  return (
    <div className="rounded-md border border-border bg-surface">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {environment.name}
        </span>
        {environment.is_active && (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            Active
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {environment.variable_count} {environment.variable_count === 1 ? 'variable' : 'variables'}
        </span>
        {!environment.is_active && (
          <Button
            variant="secondary"
            onClick={() => onActivate(environment)}
            className="py-1 text-xs"
          >
            Activate
          </Button>
        )}
        <button
          onClick={() => onRename(environment)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          aria-label="Rename environment"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(environment)}
          className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-danger"
          aria-label="Delete environment"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border">
          {variablesQuery.isLoading && (
            <div className="px-3 py-3 text-xs text-muted-foreground">Loading…</div>
          )}
          {variablesQuery.data?.results.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground">No variables yet.</div>
          )}
          {variablesQuery.data?.results.map((variable) => (
            <div
              key={variable.id}
              className="group flex items-center gap-2 border-t border-border px-3 py-2 first:border-t-0 hover:bg-surface-hover"
            >
              <span
                className={`font-mono text-sm ${variable.enabled ? 'text-foreground' : 'text-muted-foreground line-through'}`}
              >
                {variable.key}
              </span>
              <span className="flex-1 truncate font-mono text-sm text-muted-foreground">
                {variable.is_secret ? '••••' : variable.value}
              </span>
              {variable.is_secret && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  Secret
                </span>
              )}
              <div className="hidden items-center gap-1 group-hover:flex">
                <button
                  onClick={() => onEditVariable(environment, variable)}
                  className="rounded p-1 text-muted-foreground hover:bg-border hover:text-foreground"
                  aria-label="Edit variable"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteVariable(environment, variable)}
                  className="rounded p-1 text-muted-foreground hover:bg-border hover:text-danger"
                  aria-label="Delete variable"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <div className="border-t border-border px-3 py-2">
            <button
              onClick={() => onAddVariable(environment)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Variable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
