export interface Environment {
  id: string;
  name: string;
  is_active: boolean;
  variable_count: number;
  created_at: string;
  updated_at: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  is_secret: boolean;
  enabled: boolean;
}

export interface VariablePayload {
  key: string;
  value?: string;
  is_secret: boolean;
  enabled: boolean;
}
