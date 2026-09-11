export interface User {
  id: string;
  email: string;
  date_joined: string;
}

export interface AuthResponse {
  access: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
}
