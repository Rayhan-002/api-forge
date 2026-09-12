import type { RequestSnapshot } from '@/store/request-builder-store';

export interface HistoryEntry {
  id: string;
  saved_request: string | null;
  method: string;
  url: string;
  status_code: number | null;
  response_time_ms: number | null;
  response_size_bytes: number | null;
  success: boolean;
  error_message: string;
  request_snapshot: RequestSnapshot;
  response_snapshot: { headers: Record<string, string> } | null;
  executed_at: string;
}

export interface HistoryFilters {
  method?: string;
  success?: boolean;
}
