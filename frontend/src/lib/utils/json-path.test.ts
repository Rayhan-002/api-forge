import { describe, expect, it } from 'vitest';

import { extractJsonValue, PathNotFoundError } from './json-path';

describe('extractJsonValue', () => {
  it('resolves a top-level key', () => {
    expect(extractJsonValue({ token: 'abc123' }, 'token')).toBe('abc123');
  });

  it('resolves a nested dotted path', () => {
    expect(extractJsonValue({ data: { access_token: 'xyz' } }, 'data.access_token')).toBe('xyz');
  });

  it('resolves a numeric segment as an array index', () => {
    expect(extractJsonValue({ items: [{ id: 1 }, { id: 2 }] }, 'items.1.id')).toBe(2);
  });

  it('throws PathNotFoundError for a missing object key', () => {
    expect(() => extractJsonValue({ a: 1 }, 'b')).toThrow(PathNotFoundError);
  });

  it('throws PathNotFoundError for an out-of-range array index', () => {
    expect(() => extractJsonValue({ items: [1, 2] }, 'items.5')).toThrow(PathNotFoundError);
  });

  it('throws PathNotFoundError when indexing into a scalar', () => {
    expect(() => extractJsonValue({ a: 1 }, 'a.b')).toThrow(PathNotFoundError);
  });

  it('throws PathNotFoundError for a negative array index', () => {
    expect(() => extractJsonValue({ items: [1, 2] }, 'items.-1')).toThrow(PathNotFoundError);
  });
});
