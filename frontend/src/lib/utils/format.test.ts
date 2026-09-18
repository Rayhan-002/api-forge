import { describe, expect, it } from 'vitest';

import { formatBytes, formatRelativeTime, statusColorClass } from './format';

describe('formatBytes', () => {
  it('formats sub-kilobyte sizes as bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobyte-range sizes with one decimal', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabyte-range sizes with one decimal', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('statusColorClass', () => {
  it('classifies 2xx as success', () => {
    expect(statusColorClass(200)).toBe('text-success');
    expect(statusColorClass(299)).toBe('text-success');
  });

  it('classifies 3xx as info', () => {
    expect(statusColorClass(301)).toBe('text-info');
  });

  it('classifies 4xx as warning', () => {
    expect(statusColorClass(404)).toBe('text-warning');
  });

  it('classifies 5xx as danger', () => {
    expect(statusColorClass(500)).toBe('text-danger');
    expect(statusColorClass(599)).toBe('text-danger');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for timestamps within the last minute', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('formats a timestamp several minutes in the past', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('formats a timestamp several hours in the past', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
  });
});
