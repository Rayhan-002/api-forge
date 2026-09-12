'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createSavedRequest } from '@/lib/api/saved-requests';
import { executeRequest } from '@/lib/api/execute';
import { ApiError } from '@/lib/api/client';
import { buildExecutePayload, useRequestBuilderStore } from '@/store/request-builder-store';
import { SaveRequestDialog } from '@/components/collections/save-request-dialog';
import { RequestBuilder } from '@/components/request-builder/request-builder';
import { ResponsePanel } from '@/components/response-viewer/response-panel';

// Note: this page does NOT reset the draft on mount. `/workspace` is the
// landing point both for "start a blank request" (Dashboard's New Request
// button, the sidebar link — both call resetDraft() themselves before
// navigating here) and for "restore this request from history" (which
// populates the draft *before* navigating here). Resetting unconditionally
// on mount would wipe out the second case.
export default function WorkspacePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const mutation = useMutation({ mutationFn: executeRequest });

  function handleSend() {
    const payload = buildExecutePayload(useRequestBuilderStore.getState());
    mutation.mutate(payload);
  }

  const saveMutation = useMutation({
    mutationFn: ({ collectionId, name }: { collectionId: string; name: string }) => {
      const payload = buildExecutePayload(useRequestBuilderStore.getState());
      return createSavedRequest(collectionId, { ...payload, name });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collections', saved.collection, 'requests'] });
      toast.success('Request saved.');
      setSaveDialogOpen(false);
      router.push(`/workspace/${saved.id}`);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not save the request.');
    },
  });

  return (
    <div className="flex h-full flex-col divide-y divide-border">
      <div className="shrink-0">
        <RequestBuilder
          onSend={handleSend}
          isSending={mutation.isPending}
          onSave={() => setSaveDialogOpen(true)}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ResponsePanel
          result={mutation.data}
          error={mutation.error}
          isLoading={mutation.isPending}
        />
      </div>

      <SaveRequestDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSubmit={({ name, collectionId }) => saveMutation.mutate({ name, collectionId })}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
}
