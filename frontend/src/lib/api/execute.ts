import { apiFetch } from '@/lib/api/client';
import type { ExecuteRequestPayload, ExecuteResponse } from '@/types/request';

export function executeRequest(payload: ExecuteRequestPayload) {
  return apiFetch<ExecuteResponse>('/api/execute/', {
    method: 'POST',
    body: payload,
  });
}
