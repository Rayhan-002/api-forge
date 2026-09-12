'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createSavedRequest } from '@/lib/api/saved-requests';
import { executeRequest } from '@/lib/api/execute';
import { ApiError } from '@/lib/api/client';
import { buildExecutePayload, useRequestBuilderStore } from '@/store/request-builder-store';
import { SaveRequestDialog } from '@/components/collections/save-request-dialog';
import { RequestBuilder } from '@/components/request-builder/request-builder';
import { ResponsePanel } from '@/components/response-viewer/response-panel';

export default function WorkspacePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const resetDraft = useRequestBuilderStore((state) => state.resetDraft);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // A fresh, ad-hoc workspace should never carry over a previously loaded
  // saved request's fields.
  useEffect(() => {
    resetDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
