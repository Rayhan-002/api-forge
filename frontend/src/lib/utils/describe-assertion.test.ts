import { describe, expect, it } from 'vitest';

import { describeAssertion } from './describe-assertion';

describe('describeAssertion', () => {
  it('describes status_code', () => {
    expect(describeAssertion('status_code', { expected: 200 })).toBe('status_code == 200');
  });

  it('describes response_time_lt', () => {
    expect(describeAssertion('response_time_lt', { expected_ms: 500 })).toBe(
      'response_time < 500ms',
    );
  });

  it('describes header_exists', () => {
    expect(describeAssertion('header_exists', { header_name: 'Content-Type' })).toBe(
      "header 'Content-Type' exists",
    );
  });

  it('describes header_equals', () => {
    expect(
      describeAssertion('header_equals', {
        header_name: 'Content-Type',
        expected: 'application/json',
      }),
    ).toBe("header 'Content-Type' == 'application/json'");
  });

  it('describes json_field_exists', () => {
    expect(describeAssertion('json_field_exists', { path: 'user.id' })).toBe('user.id exists');
  });

  it('describes json_field_equals with a numeric expected value', () => {
    expect(describeAssertion('json_field_equals', { path: 'user.id', expected: 42 })).toBe(
      'user.id == 42',
    );
  });

  it('describes json_field_equals with a string expected value, JSON-quoted', () => {
    expect(describeAssertion('json_field_equals', { path: 'user.role', expected: 'admin' })).toBe(
      'user.role == "admin"',
    );
  });

  it('describes body_contains', () => {
    expect(describeAssertion('body_contains', { expected: 'success' })).toBe(
      "body contains 'success'",
    );
  });

  it('falls back to a "?" placeholder when the relevant config field is missing', () => {
    expect(describeAssertion('status_code', {})).toBe('status_code == ?');
  });
});
