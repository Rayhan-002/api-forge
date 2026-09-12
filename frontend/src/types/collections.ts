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
  extract_rules: unknown[];
  created_at: string;
  updated_at: string;
}

export interface CollectionPayload {
  name: string;
  description?: string;
}

export type SavedRequestPayload = Omit<
  SavedRequestDetail,
  'id' | 'collection' | 'order' | 'extract_rules' | 'created_at' | 'updated_at'
>;
