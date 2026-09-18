import { apiFetch } from '@/lib/api/client';
import type { DashboardSummary } from '@/types/dashboard';

export function getDashboardSummary() {
  return apiFetch<DashboardSummary>('/api/dashboard/summary/');
}
