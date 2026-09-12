'use client';

import { METHOD_COLOR } from '@/lib/utils/method-color';
import { HTTP_METHODS, type HttpMethod } from '@/types/request';

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
