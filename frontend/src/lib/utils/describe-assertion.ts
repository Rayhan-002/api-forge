import type { AssertionConfig, AssertionType } from '@/types/testing';

/** Mirrors apps.testing.services.describe_assertion on the backend. */
export function describeAssertion(type: AssertionType, config: AssertionConfig): string {
  switch (type) {
    case 'status_code':
      return `status_code == ${config.expected ?? '?'}`;
    case 'response_time_lt':
      return `response_time < ${config.expected_ms ?? '?'}ms`;
    case 'header_exists':
      return `header '${config.header_name ?? '?'}' exists`;
    case 'header_equals':
      return `header '${config.header_name ?? '?'}' == '${config.expected ?? '?'}'`;
    case 'json_field_exists':
      return `${config.path ?? '?'} exists`;
    case 'json_field_equals':
      return `${config.path ?? '?'} == ${JSON.stringify(config.expected) ?? '?'}`;
    case 'body_contains':
      return `body contains '${config.expected ?? '?'}'`;
    default:
      return type;
  }
}
