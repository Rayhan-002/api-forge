import type { InputHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export function Field({ label, error, hint, id, className, ...props }: FieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground',
          'placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          error && 'border-danger focus:border-danger focus:ring-danger',
          className,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
