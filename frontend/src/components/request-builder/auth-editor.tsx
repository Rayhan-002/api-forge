'use client';

import { useRequestBuilderStore } from '@/store/request-builder-store';
import type { AuthType } from '@/types/request';
import { Field } from '@/components/ui/field';

const AUTH_TYPES: Array<{ value: AuthType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api_key', label: 'API Key' },
];

export function AuthEditor() {
  const {
    authType,
    setAuthType,
    bearerToken,
    setBearerToken,
    basicUsername,
    setBasicUsername,
    basicPassword,
    setBasicPassword,
    apiKeyName,
    setApiKeyName,
    apiKeyValue,
    setApiKeyValue,
    apiKeyAddTo,
    setApiKeyAddTo,
  } = useRequestBuilderStore();

  return (
    <div className="flex flex-col gap-4">
      <select
        value={authType}
        onChange={(e) => setAuthType(e.target.value as AuthType)}
        className="w-48 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
      >
        {AUTH_TYPES.map(({ value, label }) => (
          <option key={value} value={value} className="bg-surface text-foreground">
            {label}
          </option>
        ))}
      </select>

      {authType === 'bearer' && (
        <Field
          label="Token"
          value={bearerToken}
          onChange={(e) => setBearerToken(e.target.value)}
          placeholder="{{token}}"
          className="font-mono"
        />
      )}

      {authType === 'basic' && (
        <div className="grid max-w-md grid-cols-2 gap-3">
          <Field
            label="Username"
            value={basicUsername}
            onChange={(e) => setBasicUsername(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            value={basicPassword}
            onChange={(e) => setBasicPassword(e.target.value)}
          />
        </div>
      )}

      {authType === 'api_key' && (
        <div className="flex max-w-lg flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Key" value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} />
            <Field
              label="Value"
              value={apiKeyValue}
              onChange={(e) => setApiKeyValue(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Add to</span>
            <select
              value={apiKeyAddTo}
              onChange={(e) => setApiKeyAddTo(e.target.value as 'header' | 'query')}
              className="w-40 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="header" className="bg-surface text-foreground">
                Header
              </option>
              <option value="query" className="bg-surface text-foreground">
                Query Param
              </option>
            </select>
          </div>
        </div>
      )}

      {authType === 'none' && (
        <p className="text-sm text-muted-foreground">This request does not use authorization.</p>
      )}
    </div>
  );
}
