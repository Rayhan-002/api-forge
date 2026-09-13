export type AssertionType =
  | 'status_code'
  | 'response_time_lt'
  | 'header_exists'
  | 'header_equals'
  | 'json_field_exists'
  | 'json_field_equals'
  | 'body_contains';

export const ASSERTION_TYPES: Array<{ value: AssertionType; label: string }> = [
  { value: 'status_code', label: 'Status code equals' },
  { value: 'response_time_lt', label: 'Response time less than' },
  { value: 'header_exists', label: 'Header exists' },
  { value: 'header_equals', label: 'Header equals' },
  { value: 'json_field_exists', label: 'JSON field exists' },
  { value: 'json_field_equals', label: 'JSON field equals' },
  { value: 'body_contains', label: 'Body contains' },
];

export interface AssertionConfig {
  expected?: string | number | boolean;
  expected_ms?: number;
  header_name?: string;
  path?: string;
}

export interface TestAssertion {
  id: string;
  name: string;
  type: AssertionType;
  config: AssertionConfig;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface TestAssertionPayload {
  name?: string;
  type: AssertionType;
  config: AssertionConfig;
}

export interface TestResultOutcome {
  assertion_id: string;
  name: string;
  passed: boolean;
  actual_value: string;
  message: string;
}
