import { apiFetch } from '@/lib/api/client';
import type { PaginatedResponse } from '@/types/collections';
import type { TestAssertion, TestAssertionPayload } from '@/types/testing';

export function listAssertions(savedRequestId: string) {
  return apiFetch<PaginatedResponse<TestAssertion>>(`/api/requests/${savedRequestId}/tests/`);
}

export function createAssertion(savedRequestId: string, payload: TestAssertionPayload) {
  return apiFetch<TestAssertion>(`/api/requests/${savedRequestId}/tests/`, {
    method: 'POST',
    body: payload,
  });
}

export function updateAssertion(id: string, payload: Partial<TestAssertionPayload>) {
  return apiFetch<TestAssertion>(`/api/tests/${id}/`, { method: 'PATCH', body: payload });
}

export function deleteAssertion(id: string) {
  return apiFetch<void>(`/api/tests/${id}/`, { method: 'DELETE' });
}
