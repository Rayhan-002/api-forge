import { AlertTriangle, Ban, Clock, Globe, Link2Off, Wifi, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ERROR_TYPE_META: Record<string, { icon: LucideIcon; label: string }> = {
  timeout: { icon: Clock, label: 'Request timed out' },
  dns_error: { icon: Globe, label: 'DNS lookup failed' },
  connection_error: { icon: Wifi, label: 'Connection failed' },
  invalid_url: { icon: Link2Off, label: 'Invalid URL' },
  ssrf_blocked: { icon: Ban, label: 'Blocked (unsafe target)' },
  too_many_redirects: { icon: AlertTriangle, label: 'Too many redirects' },
  response_too_large: { icon: AlertTriangle, label: 'Response too large' },
  invalid_body_type: { icon: AlertTriangle, label: 'Invalid body' },
  invalid_auth_type: { icon: AlertTriangle, label: 'Invalid auth' },
  request_error: { icon: XCircle, label: 'Request failed' },
};

export function ResponseErrorState({
  errorType,
  errorMessage,
}: {
  errorType: string;
  errorMessage: string;
}) {
  const meta = ERROR_TYPE_META[errorType] ?? ERROR_TYPE_META.request_error;
  const Icon = meta.icon;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <Icon className="h-8 w-8 text-danger" />
      <p className="text-sm font-medium text-danger">{meta.label}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{errorMessage}</p>
    </div>
  );
}
