'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  activateEnvironment,
  createEnvironment,
  createVariable,
  deleteEnvironment,
  deleteVariable,
  listEnvironments,
  renameEnvironment,
  updateVariable,
} from '@/lib/api/environments';
import type { Environment, EnvironmentVariable, VariablePayload } from '@/types/environments';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EnvironmentFormDialog } from '@/components/environments/environment-form-dialog';
import { EnvironmentRow } from '@/components/environments/environment-row';
import { VariableFormDialog } from '@/components/environments/variable-form-dialog';
import { Skeleton } from '@/components/ui/skeleton';

type DialogState =
  | { type: 'none' }
  | { type: 'create-environment' }
  | { type: 'rename-environment'; environment: Environment }
  | { type: 'delete-environment'; environment: Environment }
  | { type: 'add-variable'; environment: Environment }
  | { type: 'edit-variable'; environment: Environment; variable: EnvironmentVariable }
  | { type: 'delete-variable'; environment: Environment; variable: EnvironmentVariable };

export default function EnvironmentsPage() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  const environmentsQuery = useQuery({ queryKey: ['environments'], queryFn: listEnvironments });
  const environments = environmentsQuery.data?.results ?? [];

  function closeDialog() {
    setDialog({ type: 'none' });
  }

  function invalidateVariablesFor(environmentId: string) {
    queryClient.invalidateQueries({ queryKey: ['environments', environmentId, 'variables'] });
  }

  function invalidateEnvironments() {
    queryClient.invalidateQueries({ queryKey: ['environments'] });
  }

  const createEnvMutation = useMutation({
    mutationFn: createEnvironment,
    onSuccess: () => {
      invalidateEnvironments();
      toast.success('Environment created.');
      closeDialog();
    },
  });

  const renameEnvMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameEnvironment(id, name),
    onSuccess: () => {
      invalidateEnvironments();
      toast.success('Environment renamed.');
      closeDialog();
    },
  });

  const deleteEnvMutation = useMutation({
    mutationFn: deleteEnvironment,
    onSuccess: () => {
      invalidateEnvironments();
      toast.success('Environment deleted.');
      closeDialog();
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateEnvironment,
    onSuccess: (activated) => {
      invalidateEnvironments();
      toast.success(`"${activated.name}" is now active.`);
    },
  });

  const addVariableMutation = useMutation({
    mutationFn: ({ environmentId, payload }: { environmentId: string; payload: VariablePayload }) =>
      createVariable(environmentId, payload),
    onSuccess: (_data, variables) => {
      invalidateVariablesFor(variables.environmentId);
      invalidateEnvironments();
      toast.success('Variable added.');
      closeDialog();
    },
  });

  const editVariableMutation = useMutation({
    mutationFn: ({
      environmentId,
      variableId,
      payload,
    }: {
      environmentId: string;
      variableId: string;
      payload: Partial<VariablePayload>;
    }) => updateVariable(environmentId, variableId, payload),
    onSuccess: (_data, variables) => {
      invalidateVariablesFor(variables.environmentId);
      toast.success('Variable updated.');
      closeDialog();
    },
  });

  const deleteVariableMutation = useMutation({
    mutationFn: ({ environmentId, variableId }: { environmentId: string; variableId: string }) =>
      deleteVariable(environmentId, variableId),
    onSuccess: (_data, variables) => {
      invalidateVariablesFor(variables.environmentId);
      invalidateEnvironments();
      toast.success('Variable deleted.');
      closeDialog();
    },
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Environments</h1>
        <Button onClick={() => setDialog({ type: 'create-environment' })}>
          <Plus className="h-4 w-4" />
          New Environment
        </Button>
      </div>

      {environmentsQuery.isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      )}

      {!environmentsQuery.isLoading && environments.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-16 text-center">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">You don&apos;t have any environments yet.</p>
          <Button variant="secondary" onClick={() => setDialog({ type: 'create-environment' })}>
            Create your first environment
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {environments.map((environment) => (
          <EnvironmentRow
            key={environment.id}
            environment={environment}
            onActivate={(env) => activateMutation.mutate(env.id)}
            onRename={(env) => setDialog({ type: 'rename-environment', environment: env })}
            onDelete={(env) => setDialog({ type: 'delete-environment', environment: env })}
            onAddVariable={(env) => setDialog({ type: 'add-variable', environment: env })}
            onEditVariable={(env, variable) =>
              setDialog({ type: 'edit-variable', environment: env, variable })
            }
            onDeleteVariable={(env, variable) =>
              setDialog({ type: 'delete-variable', environment: env, variable })
            }
          />
        ))}
      </div>

      <EnvironmentFormDialog
        open={dialog.type === 'create-environment'}
        onClose={closeDialog}
        onSubmit={(name) => createEnvMutation.mutate(name)}
        isLoading={createEnvMutation.isPending}
        title="New environment"
        submitLabel="Create"
      />

      <EnvironmentFormDialog
        open={dialog.type === 'rename-environment'}
        onClose={closeDialog}
        onSubmit={(name) => {
          if (dialog.type !== 'rename-environment') return;
          renameEnvMutation.mutate({ id: dialog.environment.id, name });
        }}
        isLoading={renameEnvMutation.isPending}
        initialName={dialog.type === 'rename-environment' ? dialog.environment.name : undefined}
        title="Rename environment"
        submitLabel="Save"
      />

      <ConfirmDialog
        open={dialog.type === 'delete-environment'}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog.type !== 'delete-environment') return;
          deleteEnvMutation.mutate(dialog.environment.id);
        }}
        isLoading={deleteEnvMutation.isPending}
        title="Delete environment"
        message={
          dialog.type === 'delete-environment'
            ? `Delete "${dialog.environment.name}" and all ${dialog.environment.variable_count} variable(s) in it? This cannot be undone.`
            : ''
        }
      />

      <VariableFormDialog
        open={dialog.type === 'add-variable'}
        onClose={closeDialog}
        onSubmit={(payload) => {
          if (dialog.type !== 'add-variable') return;
          addVariableMutation.mutate({ environmentId: dialog.environment.id, payload });
        }}
        isLoading={addVariableMutation.isPending}
      />

      <VariableFormDialog
        open={dialog.type === 'edit-variable'}
        onClose={closeDialog}
        onSubmit={(payload) => {
          if (dialog.type !== 'edit-variable') return;
          editVariableMutation.mutate({
            environmentId: dialog.environment.id,
            variableId: dialog.variable.id,
            payload,
          });
        }}
        isLoading={editVariableMutation.isPending}
        initial={dialog.type === 'edit-variable' ? dialog.variable : undefined}
      />

      <ConfirmDialog
        open={dialog.type === 'delete-variable'}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog.type !== 'delete-variable') return;
          deleteVariableMutation.mutate({
            environmentId: dialog.environment.id,
            variableId: dialog.variable.id,
          });
        }}
        isLoading={deleteVariableMutation.isPending}
        title="Delete variable"
        message={dialog.type === 'delete-variable' ? `Delete "${dialog.variable.key}"?` : ''}
      />
    </div>
  );
}
