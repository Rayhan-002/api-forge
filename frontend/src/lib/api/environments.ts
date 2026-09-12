import { apiFetch } from '@/lib/api/client';
import type { PaginatedResponse } from '@/types/collections';
import type { Environment, EnvironmentVariable, VariablePayload } from '@/types/environments';

export function listEnvironments() {
  return apiFetch<PaginatedResponse<Environment>>('/api/environments/');
}

export function createEnvironment(name: string) {
  return apiFetch<Environment>('/api/environments/', { method: 'POST', body: { name } });
}

export function renameEnvironment(id: string, name: string) {
  return apiFetch<Environment>(`/api/environments/${id}/`, { method: 'PATCH', body: { name } });
}

export function deleteEnvironment(id: string) {
  return apiFetch<void>(`/api/environments/${id}/`, { method: 'DELETE' });
}

export function activateEnvironment(id: string) {
  return apiFetch<Environment>(`/api/environments/${id}/activate/`, { method: 'POST' });
}

export function deactivateEnvironment() {
  return apiFetch<void>('/api/environments/deactivate/', { method: 'POST' });
}

export function listVariables(environmentId: string) {
  return apiFetch<PaginatedResponse<EnvironmentVariable>>(
    `/api/environments/${environmentId}/variables/`,
  );
}

export function createVariable(environmentId: string, payload: VariablePayload) {
  return apiFetch<EnvironmentVariable>(`/api/environments/${environmentId}/variables/`, {
    method: 'POST',
    body: payload,
  });
}

export function updateVariable(
  environmentId: string,
  variableId: string,
  payload: Partial<VariablePayload>,
) {
  return apiFetch<EnvironmentVariable>(
    `/api/environments/${environmentId}/variables/${variableId}/`,
    {
      method: 'PATCH',
      body: payload,
    },
  );
}

export function deleteVariable(environmentId: string, variableId: string) {
  return apiFetch<void>(`/api/environments/${environmentId}/variables/${variableId}/`, {
    method: 'DELETE',
  });
}
