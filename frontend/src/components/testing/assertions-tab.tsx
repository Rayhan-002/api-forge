'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  createAssertion,
  deleteAssertion,
  listAssertions,
  updateAssertion,
} from '@/lib/api/testing';
import { describeAssertion } from '@/lib/utils/describe-assertion';
import type { TestAssertion, TestAssertionPayload } from '@/types/testing';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AssertionFormDialog } from '@/components/testing/assertion-form-dialog';

type DialogState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; assertion: TestAssertion }
  | { type: 'delete'; assertion: TestAssertion };

/** Manages a saved request's assertion definitions — results are shown separately, in the response viewer's Tests tab after Send. */
export function AssertionsTab({ savedRequestId }: { savedRequestId: string }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  const assertionsQuery = useQuery({
    queryKey: ['requests', savedRequestId, 'tests'],
    queryFn: () => listAssertions(savedRequestId),
  });
  const assertions = assertionsQuery.data?.results ?? [];

  function closeDialog() {
    setDialog({ type: 'none' });
  }
  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['requests', savedRequestId, 'tests'] });
  }

  const createMutation = useMutation({
    mutationFn: (payload: TestAssertionPayload) => createAssertion(savedRequestId, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Assertion added.');
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TestAssertionPayload }) =>
      updateAssertion(id, payload),
    onSuccess: () => {
      invalidate();
      toast.success('Assertion updated.');
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAssertion(id),
    onSuccess: () => {
      invalidate();
      toast.success('Assertion deleted.');
      closeDialog();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      {assertionsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!assertionsQuery.isLoading && assertions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No assertions yet. Add one to check the response automatically on every Send.
        </p>
      )}
      {assertions.map((assertion) => (
        <div
          key={assertion.id}
          className="group flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
        >
          <span className="flex-1 truncate font-mono text-sm text-foreground">
            {assertion.name || describeAssertion(assertion.type, assertion.config)}
          </span>
          <div className="hidden items-center gap-1 group-hover:flex">
            <button
              onClick={() => setDialog({ type: 'edit', assertion })}
              className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              title="Edit this assertion"
              aria-label="Edit assertion"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDialog({ type: 'delete', assertion })}
              className="rounded p-1 text-muted-foreground hover:bg-surface-hover hover:text-danger"
              title="Delete this assertion"
              aria-label="Delete assertion"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() => setDialog({ type: 'create' })}
        className="self-start"
      >
        <Plus className="h-4 w-4" />
        Add Assertion
      </Button>

      <AssertionFormDialog
        open={dialog.type === 'create'}
        onClose={closeDialog}
        onSubmit={(payload) => createMutation.mutate(payload)}
        isLoading={createMutation.isPending}
      />
      <AssertionFormDialog
        open={dialog.type === 'edit'}
        onClose={closeDialog}
        onSubmit={(payload) => {
          if (dialog.type !== 'edit') return;
          updateMutation.mutate({ id: dialog.assertion.id, payload });
        }}
        isLoading={updateMutation.isPending}
        initial={dialog.type === 'edit' ? dialog.assertion : undefined}
      />
      <ConfirmDialog
        open={dialog.type === 'delete'}
        onClose={closeDialog}
        onConfirm={() => {
          if (dialog.type !== 'delete') return;
          deleteMutation.mutate(dialog.assertion.id);
        }}
        isLoading={deleteMutation.isPending}
        title="Delete assertion"
        message={
          dialog.type === 'delete'
            ? `Delete "${dialog.assertion.name || describeAssertion(dialog.assertion.type, dialog.assertion.config)}"?`
            : ''
        }
      />
    </div>
  );
}
