import type { HttpMethod } from '@/types/request';

export interface DashboardCounts {
  collections: number;
  saved_requests: number;
  environments: number;
  history_entries: number;
}

export interface RecentActivityEntry {
  id: string;
  method: HttpMethod;
  url: string;
  status_code: number | null;
  success: boolean;
  executed_at: string;
  saved_request_id: string | null;
  saved_request_name: string | null;
}

export interface TestSummary {
  total: number;
  passed: number;
}

export interface DashboardSummary {
  counts: DashboardCounts;
  recent_activity: RecentActivityEntry[];
  test_summary: TestSummary;
}
