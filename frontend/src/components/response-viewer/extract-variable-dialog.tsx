'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import {
  listEnvironments,
  listVariables,
  createVariable,
  updateVariable,
} from '@/lib/api/environments';
import { updateSavedRequest } from '@/lib/api/saved-requests';
import { extractJsonValue, PathNotFoundError } from '@/lib/utils/json-path';
import type { ExtractRule } from '@/types/collections';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';

interface ExtractVariableDialogProps {
  open: boolean;
  onClose: () => void;
  savedRequestId: string;
  existingRules: ExtractRule[];
  responseData: unknown;
}

export function ExtractVariableDialog({
  open,
  onClose,
  savedRequestId,
  existingRules,
  responseData,
}: ExtractVariableDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Extract to variable">
      <ExtractForm
        onClose={onClose}
        savedRequestId={savedRequestId}
        existingRules={existingRules}
        responseData={responseData}
      />
    </Dialog>
  );
}

function ExtractForm({
  onClose,
  savedRequestId,
  existingRules,
  responseData,
}: Omit<ExtractVariableDialogProps, 'open'>) {
  const queryClient = useQueryClient();
  const environmentsQuery = useQuery({ queryKey: ['environments'], queryFn: listEnvironments });
  const environments = environmentsQuery.data?.results ?? [];
  const activeEnvironment = environments.find((env) => env.is_active);

  const [sourcePath, setSourcePath] = useState('');
  const [variableName, setVariableName] = useState('');
  const [targetEnvironment, setTargetEnvironment] = useState(
    activeEnvironment?.id ?? environments[0]?.id ?? '',
  );
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const value = extractJsonValue(responseData, sourcePath.trim());
      const stringValue = value === null || value === undefined ? '' : String(value);

      const existing = await listVariables(targetEnvironment);
      const match = existing.results.find((v) => v.key === variableName.trim());
      if (match) {
        await updateVariable(targetEnvironment, match.id, { value: stringValue });
      } else {
        await createVariable(targetEnvironment, {
          key: variableName.trim(),
          value: stringValue,
          is_secret: false,
          enabled: true,
        });
      }

      const nextRules = [
        ...existingRules.filter((r) => r.variable_name !== variableName.trim()),
        {
          variable_name: variableName.trim(),
          source_path: sourcePath.trim(),
          target_environment: targetEnvironment,
        },
      ];
      await updateSavedRequest(savedRequestId, { extract_rules: nextRules });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', savedRequestId] });
      queryClient.invalidateQueries({ queryKey: ['environments', targetEnvironment, 'variables'] });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
      setFormError(null);
      toast.success(`Extracted into "${variableName.trim()}" — will auto-run on future sends too.`);
      onClose();
    },
    onError: (error) => {
      setFormError(
        error instanceof PathNotFoundError ? error.message : 'Could not extract that value.',
      );
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!sourcePath.trim() || !variableName.trim() || !targetEnvironment) return;
    mutation.mutate();
  }

  if (environmentsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading environments…</p>;
  }

  if (environments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You need an environment first — create one from the Environments page, then come back.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="JSON Path"
        name="source_path"
        value={sourcePath}
        onChange={(e) => setSourcePath(e.target.value)}
        placeholder="token or data.access_token"
        className="font-mono"
        autoFocus
        required
        hint="Dotted path into the response body above, e.g. items.0.id"
      />
      <Field
        label="Variable Name"
        name="variable_name"
        value={variableName}
        onChange={(e) => setVariableName(e.target.value)}
        placeholder="token"
        className="font-mono"
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="extract-target-env" className="text-sm font-medium text-foreground">
          Target environment
        </label>
        <select
          id="extract-target-env"
          value={targetEnvironment}
          onChange={(e) => setTargetEnvironment(e.target.value)}
          className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        >
          {environments.map((env) => (
            <option key={env.id} value={env.id} className="bg-surface text-foreground">
              {env.name}
            </option>
          ))}
        </select>
      </div>

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <p className="text-xs text-muted-foreground">
        Extracts the value now, and re-runs automatically every time you send this saved request
        again.
      </p>

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={mutation.isPending}
          disabled={!sourcePath.trim() || !variableName.trim()}
        >
          Extract
        </Button>
      </div>
    </form>
  );
}
