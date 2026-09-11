'use client';

import { HTTP_METHODS, type HttpMethod } from '@/types/request';

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: 'text-success',
  POST: 'text-method-post',
  PUT: 'text-info',
  PATCH: 'text-method-patch',
  DELETE: 'text-danger',
  HEAD: 'text-muted-foreground',
  OPTIONS: 'text-muted-foreground',
};

export function MethodSelect({
  value,
  onChange,
}: {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as HttpMethod)}
      className={`h-10 shrink-0 rounded-md border border-border bg-surface px-3 font-mono text-sm font-semibold focus:border-accent focus:outline-none ${METHOD_COLOR[value]}`}
    >
      {HTTP_METHODS.map((method) => (
        <option key={method} value={method} className="bg-surface text-foreground">
          {method}
        </option>
      ))}
    </select>
  );
}
