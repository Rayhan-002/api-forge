'use client';

import { useMutation } from '@tanstack/react-query';

import { executeRequest } from '@/lib/api/execute';
import { buildExecutePayload, useRequestBuilderStore } from '@/store/request-builder-store';
import { RequestBuilder } from '@/components/request-builder/request-builder';
import { ResponsePanel } from '@/components/response-viewer/response-panel';

export default function WorkspacePage() {
  const mutation = useMutation({ mutationFn: executeRequest });

  function handleSend() {
    const payload = buildExecutePayload(useRequestBuilderStore.getState());
    mutation.mutate(payload);
  }

  return (
    <div className="flex h-full flex-col divide-y divide-border">
      <div className="shrink-0">
        <RequestBuilder onSend={handleSend} isSending={mutation.isPending} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ResponsePanel
          result={mutation.data}
          error={mutation.error}
          isLoading={mutation.isPending}
        />
      </div>
    </div>
  );
}
