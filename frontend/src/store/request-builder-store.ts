import { create } from 'zustand';

import type {
  AuthConfig,
  AuthType,
  BodyType,
  ExecuteRequestPayload,
  HttpMethod,
  KeyValueRow,
} from '@/types/request';
import type { SavedRequestDetail } from '@/types/collections';

export function newRow(): KeyValueRow {
  return { id: crypto.randomUUID(), key: '', value: '', enabled: true };
}

function rowsFromPlain(
  rows: Array<{ key: string; value: string; enabled: boolean }>,
): KeyValueRow[] {
  if (rows.length === 0) return [newRow()];
  return rows.map((r) => ({ id: crypto.randomUUID(), ...r }));
}

interface RequestBuilderState {
  /** Which saved request's fields are currently loaded, if any — read this
   * (not local component state) to know whether hydration has completed,
   * so it updates in the same store-driven render as the fields do. */
  loadedRequestId: string | null;
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
  loadFromSavedRequest: (detail: SavedRequestDetail) => void;
  resetDraft: () => void;
}

const BLANK_DRAFT = {
  method: 'GET' as HttpMethod,
  url: '',
  bodyType: 'none' as BodyType,
  rawBody: '',
  authType: 'none' as AuthType,
  bearerToken: '',
  basicUsername: '',
  basicPassword: '',
  apiKeyName: '',
  apiKeyValue: '',
  apiKeyAddTo: 'header' as const,
};

export const useRequestBuilderStore = create<RequestBuilderState>((set) => ({
  loadedRequestId: null,
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

  loadFromSavedRequest: (detail) => {
    const isRawBody = detail.body_type === 'raw' || detail.body_type === 'json';
    const authConfig = detail.auth_config as Record<string, string> | null;

    set({
      loadedRequestId: detail.id,
      method: detail.method,
      url: detail.url,
      params: rowsFromPlain(detail.params),
      headers: rowsFromPlain(detail.headers),
      bodyType: detail.body_type,
      rawBody: isRawBody && typeof detail.body === 'string' ? detail.body : '',
      formBody: !isRawBody && Array.isArray(detail.body) ? rowsFromPlain(detail.body) : [newRow()],
      authType: detail.auth_type,
      bearerToken: detail.auth_type === 'bearer' ? (authConfig?.token ?? '') : '',
      basicUsername: detail.auth_type === 'basic' ? (authConfig?.username ?? '') : '',
      basicPassword: detail.auth_type === 'basic' ? (authConfig?.password ?? '') : '',
      apiKeyName: detail.auth_type === 'api_key' ? (authConfig?.key_name ?? '') : '',
      apiKeyValue: detail.auth_type === 'api_key' ? (authConfig?.key_value ?? '') : '',
      apiKeyAddTo:
        detail.auth_type === 'api_key'
          ? ((authConfig?.add_to as 'header' | 'query') ?? 'header')
          : 'header',
    });
  },

  resetDraft: () =>
    set({
      ...BLANK_DRAFT,
      loadedRequestId: null,
      params: [newRow()],
      headers: [newRow()],
      formBody: [newRow()],
    }),
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
