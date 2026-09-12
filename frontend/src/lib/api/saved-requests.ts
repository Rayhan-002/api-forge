import { apiFetch } from '@/lib/api/client';
import type {
  PaginatedResponse,
  SavedRequestDetail,
  SavedRequestListItem,
  SavedRequestPayload,
} from '@/types/collections';

export function listRequestsInCollection(collectionId: string) {
  return apiFetch<PaginatedResponse<SavedRequestListItem>>(
    `/api/collections/${collectionId}/requests/`,
  );
}

export function createSavedRequest(collectionId: string, payload: SavedRequestPayload) {
  return apiFetch<SavedRequestDetail>(`/api/collections/${collectionId}/requests/`, {
    method: 'POST',
    body: payload,
  });
}

export function getSavedRequest(id: string) {
  return apiFetch<SavedRequestDetail>(`/api/requests/${id}/`);
}

export function updateSavedRequest(id: string, payload: Partial<SavedRequestPayload>) {
  return apiFetch<SavedRequestDetail>(`/api/requests/${id}/`, { method: 'PATCH', body: payload });
}

export function deleteSavedRequest(id: string) {
  return apiFetch<void>(`/api/requests/${id}/`, { method: 'DELETE' });
}

export function moveSavedRequest(id: string, targetCollectionId: string) {
  return apiFetch<SavedRequestDetail>(`/api/requests/${id}/move/`, {
    method: 'POST',
    body: { collection: targetCollectionId },
  });
}
