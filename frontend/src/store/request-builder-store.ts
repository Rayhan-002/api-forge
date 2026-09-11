import { create } from 'zustand';

import type {
  AuthConfig,
  AuthType,
  BodyType,
  ExecuteRequestPayload,
  HttpMethod,
  KeyValueRow,
} from '@/types/request';

export function newRow(): KeyValueRow {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true };
}

interface RequestBuilderState {
  method: HttpMethod;
  url: string;
  params: KeyValueRow[];
  headers: KeyValueRow[];
  bodyType: BodyType;
  rawBody: string;
  formBody: KeyValueRow[];
  authType: AuthType;
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyAddTo: 'header' | 'query';

  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setParams: (rows: KeyValueRow[]) => void;
  setHeaders: (rows: KeyValueRow[]) => void;
  setBodyType: (type: BodyType) => void;
  setRawBody: (value: string) => void;
  setFormBody: (rows: KeyValueRow[]) => void;
  setAuthType: (type: AuthType) => void;
  setBearerToken: (value: string) => void;
  setBasicUsername: (value: string) => void;
  setBasicPassword: (value: string) => void;
  setApiKeyName: (value: string) => void;
  setApiKeyValue: (value: string) => void;
  setApiKeyAddTo: (value: 'header' | 'query') => void;
}

export const useRequestBuilderStore = create<RequestBuilderState>((set) => ({
  method: 'GET',
  url: '',
  params: [newRow()],
  headers: [newRow()],
  bodyType: 'none',
  rawBody: '',
  formBody: [newRow()],
  authType: 'none',
  bearerToken: '',
  basicUsername: '',
  basicPassword: '',
  apiKeyName: '',
  apiKeyValue: '',
  apiKeyAddTo: 'header',

  setMethod: (method) => set({ method }),
  setUrl: (url) => set({ url }),
  setParams: (params) => set({ params }),
  setHeaders: (headers) => set({ headers }),
  setBodyType: (bodyType) => set({ bodyType }),
  setRawBody: (rawBody) => set({ rawBody }),
  setFormBody: (formBody) => set({ formBody }),
  setAuthType: (authType) => set({ authType }),
  setBearerToken: (bearerToken) => set({ bearerToken }),
  setBasicUsername: (basicUsername) => set({ basicUsername }),
  setBasicPassword: (basicPassword) => set({ basicPassword }),
  setApiKeyName: (apiKeyName) => set({ apiKeyName }),
  setApiKeyValue: (apiKeyValue) => set({ apiKeyValue }),
  setApiKeyAddTo: (apiKeyAddTo) => set({ apiKeyAddTo }),
}));

function toPlainRows(rows: KeyValueRow[]) {
  return rows.map(({ key, value, enabled }) => ({ key, value, enabled }));
}

/** Derives the wire payload for POST /api/execute/ from the current draft state. */
export function buildExecutePayload(state: RequestBuilderState): ExecuteRequestPayload {
  let body: ExecuteRequestPayload['body'] = null;
  if (state.bodyType === 'raw' || state.bodyType === 'json') {
    body = state.rawBody || null;
  } else if (state.bodyType === 'form-urlencoded' || state.bodyType === 'multipart') {
    body = toPlainRows(state.formBody);
  }

  let authConfig: AuthConfig = null;
  if (state.authType === 'bearer') {
    authConfig = { token: state.bearerToken };
  } else if (state.authType === 'basic') {
    authConfig = { username: state.basicUsername, password: state.basicPassword };
  } else if (state.authType === 'api_key') {
    authConfig = {
      key_name: state.apiKeyName,
      key_value: state.apiKeyValue,
      add_to: state.apiKeyAddTo,
    };
  }

  return {
    method: state.method,
    url: state.url,
    params: toPlainRows(state.params),
    headers: toPlainRows(state.headers),
    body_type: state.bodyType,
    body,
    auth_type: state.authType,
    auth_config: authConfig,
  };
}
