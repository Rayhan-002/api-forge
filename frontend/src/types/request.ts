export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

export type BodyType = 'none' | 'raw' | 'json' | 'form-urlencoded' | 'multipart';

export type AuthType = 'none' | 'bearer' | 'basic' | 'api_key';

export interface KeyValueRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface BearerAuthConfig {
  token: string;
}

export interface BasicAuthConfig {
  username: string;
  password: string;
}

export interface ApiKeyAuthConfig {
  key_name: string;
  key_value: string;
  add_to: 'header' | 'query';
}

export type AuthConfig = BearerAuthConfig | BasicAuthConfig | ApiKeyAuthConfig | null;

export interface ExecuteRequestPayload {
  method: HttpMethod;
  url: string;
  params: Array<{ key: string; value: string; enabled: boolean }>;
  headers: Array<{ key: string; value: string; enabled: boolean }>;
  body_type: BodyType;
  body: string | Array<{ key: string; value: string; enabled: boolean }> | null;
  auth_type: AuthType;
  auth_config: AuthConfig;
}

export interface ExtractionOutcome {
  variable_name: string;
  target_environment: string;
  success: boolean;
  message: string;
}

export interface ExecuteResponseSuccess {
  success: true;
  status_code: number;
  reason_phrase: string;
  headers: Record<string, string>;
  body: string;
  url: string;
  elapsed_ms: number;
  size_bytes: number;
  extractions: ExtractionOutcome[];
}

export interface ExecuteResponseFailure {
  success: false;
  error_type: string;
  error_message: string;
}

export type ExecuteResponse = ExecuteResponseSuccess | ExecuteResponseFailure;
