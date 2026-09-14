import { apiFetch } from '@/lib/api/client';
import type { Collection, CollectionPayload, PaginatedResponse } from '@/types/collections';

export function listCollections() {
  // The frontend builds the full folder tree client-side from a flat list,
  // so it needs every collection in one page, not just the default 20 —
  // page_size is the existing DRF pagination knob (capped at 100 server-side).
  return apiFetch<PaginatedResponse<Collection>>('/api/collections/?page_size=100');
}

export function createCollection(payload: CollectionPayload) {
  return apiFetch<Collection>('/api/collections/', { method: 'POST', body: payload });
}

export function updateCollection(id: string, payload: Partial<CollectionPayload>) {
  return apiFetch<Collection>(`/api/collections/${id}/`, { method: 'PATCH', body: payload });
}

export function moveCollection(id: string, parentId: string | null) {
  return apiFetch<Collection>(`/api/collections/${id}/`, {
    method: 'PATCH',
    body: { parent: parentId },
  });
}

export function deleteCollection(id: string) {
  return apiFetch<void>(`/api/collections/${id}/`, { method: 'DELETE' });
}
