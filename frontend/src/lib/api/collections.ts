import { apiFetch } from '@/lib/api/client';
import type { Collection, CollectionPayload, PaginatedResponse } from '@/types/collections';

export function listCollections() {
  return apiFetch<PaginatedResponse<Collection>>('/api/collections/');
}

export function createCollection(payload: CollectionPayload) {
  return apiFetch<Collection>('/api/collections/', { method: 'POST', body: payload });
}

export function updateCollection(id: string, payload: Partial<CollectionPayload>) {
  return apiFetch<Collection>(`/api/collections/${id}/`, { method: 'PATCH', body: payload });
}

export function deleteCollection(id: string) {
  return apiFetch<void>(`/api/collections/${id}/`, { method: 'DELETE' });
}
