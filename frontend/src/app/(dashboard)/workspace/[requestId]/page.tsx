'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { use, useEffect } from 'react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api/client';
import { executeSavedRequest, getSavedRequest, updateSavedRequest } from '@/lib/api/saved-requests';
import { buildExecutePayload, useRequestBuilderStore } from '@/store/request-builder-store';
import { ExtractRulesSummary } from '@/components/request-builder/extract-rules-summary';
import { RequestBuilder } from '@/components/request-builder/request-builder';
import { ResponsePanel } from '@/components/response-viewer/response-panel';

export default function SavedRequestWorkspacePage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = use(params);
  const queryClient = useQueryClient();
  const loadFromSavedRequest = useRequestBuilderStore((state) => state.loadFromSavedRequest);
  const loadedRequestId = useRequestBuilderStore((state) => state.loadedRequestId);

  const detailQuery = useQuery({
    queryKey: ['requests', requestId],
    queryFn: () => getSavedRequest(requestId),
  });

  useEffect(() => {
    if (detailQuery.data) {
      loadFromSavedRequest(detailQuery.data);
    }
  }, [detailQuery.data, loadFromSavedRequest]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = buildExecutePayload(useRequestBuilderStore.getState());
      return executeSavedRequest(requestId, payload);
    },
    onSuccess: (result) => {
      if (!result.success) return;
      for (const extraction of result.extractions) {
        if (extraction.success) {
          toast.success(extraction.message);
        } else {
          toast.warning(
            `Extraction for "${extraction.variable_name}" failed: ${extraction.message}`,
          );
        }
      }
      if (result.test_results.length > 0) {
        const passedCount = result.test_results.filter((r) => r.passed).length;
        const total = result.test_results.length;
        if (passedCount === total) {
          toast.success(`All ${total} test${total === 1 ? '' : 's'} passed.`);
        } else {
          toast.error(`${passedCount}/${total} tests passed — check the Tests tab.`);
        }
      }
    },
  });

  function handleSend() {
    mutation.mutate();
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = buildExecutePayload(useRequestBuilderStore.getState());
      return updateSavedRequest(requestId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests', requestId] });
      if (detailQuery.data) {
        queryClient.invalidateQueries({
          queryKey: ['collections', detailQuery.data.collection, 'requests'],
        });
      }
      toast.success('Saved.');
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not save changes.');
    },
  });

  if (detailQuery.isLoading || loadedRequestId !== requestId) {
    return <div className="p-6 text-sm text-muted-foreground">Loading request…</div>;
  }

  if (detailQuery.isError) {
    const message =
      detailQuery.error instanceof ApiError
        ? detailQuery.error.message
        : 'Could not load this request.';
    return (
      <div className="p-6">
        <p className="text-sm font-medium text-danger">Couldn&apos;t load request</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col divide-y divide-border">
      <div className="shrink-0">
        <RequestBuilder
          onSend={handleSend}
          isSending={mutation.isPending}
          requestName={detailQuery.data?.name}
          onSave={() => saveMutation.mutate()}
          isSaving={saveMutation.isPending}
          savedRequestId={requestId}
        />
        <ExtractRulesSummary
          savedRequestId={requestId}
          rules={detailQuery.data?.extract_rules ?? []}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <ResponsePanel
          result={mutation.data}
          error={mutation.error}
          isLoading={mutation.isPending}
          savedRequestId={requestId}
          extractRules={detailQuery.data?.extract_rules ?? []}
        />
      </div>
    </div>
  );
}
