export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function statusColorClass(status: number): string {
  if (status < 300) return 'text-success';
  if (status < 400) return 'text-info';
  if (status < 500) return 'text-warning';
  return 'text-danger';
}
