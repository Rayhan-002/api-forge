import type { AuthConfig, AuthType, BodyType, HttpMethod } from '@/types/request';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  parent: string | null;
  request_count: number;
  created_at: string;
  updated_at: string;
}

export interface SavedRequestListItem {
  id: string;
  collection: string;
  name: string;
  method: HttpMethod;
  order: number;
  updated_at: string;
}

export interface ExtractRule {
  variable_name: string;
  source_path: string;
  target_environment: string;
}

export interface SavedRequestDetail {
  id: string;
  collection: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: Array<{ key: string; value: string; enabled: boolean }>;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  body_type: BodyType;
  body: string | Array<{ key: string; value: string; enabled: boolean }> | null;
  auth_type: AuthType;
  auth_config: AuthConfig;
  order: number;
  extract_rules: ExtractRule[];
  created_at: string;
  updated_at: string;
}

export interface CollectionPayload {
  name: string;
  description?: string;
  parent?: string | null;
}

export type SavedRequestPayload = Omit<
  SavedRequestDetail,
  'id' | 'collection' | 'order' | 'extract_rules' | 'created_at' | 'updated_at'
> & {
  // Optional on write — the backend defaults it to [] on create, and it's
  // otherwise only ever changed via the extraction-rule flows, not a
  // regular request save.
  extract_rules?: ExtractRule[];
};
