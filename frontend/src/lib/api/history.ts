import { apiFetch } from '@/lib/api/client';
import type { PaginatedResponse } from '@/types/collections';
import type { HistoryEntry, HistoryFilters } from '@/types/history';

export function listHistory(filters: HistoryFilters = {}) {
  const query = new URLSearchParams();
  if (filters.method) query.set('method', filters.method);
  if (filters.success !== undefined) query.set('success', String(filters.success));
  const qs = query.toString();
  return apiFetch<PaginatedResponse<HistoryEntry>>(`/api/history/${qs ? `?${qs}` : ''}`);
}

export function deleteHistoryEntry(id: string) {
  return apiFetch<void>(`/api/history/${id}/`, { method: 'DELETE' });
}

export function clearHistory() {
  return apiFetch<void>('/api/history/clear/', { method: 'DELETE' });
}
