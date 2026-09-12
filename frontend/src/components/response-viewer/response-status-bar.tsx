import { formatBytes, statusColorClass } from '@/lib/utils/format';

interface ResponseStatusBarProps {
  statusCode: number;
  reasonPhrase: string;
  elapsedMs: number;
  sizeBytes: number;
}

export function ResponseStatusBar({
  statusCode,
  reasonPhrase,
  elapsedMs,
  sizeBytes,
}: ResponseStatusBarProps) {
  return (
    <div className="flex shrink-0 items-center gap-4 px-4 py-3 text-sm">
      <span className={`font-mono font-semibold ${statusColorClass(statusCode)}`}>
        {statusCode} {reasonPhrase}
      </span>
      <span className="text-muted-foreground">{elapsedMs} ms</span>
      <span className="text-muted-foreground">{formatBytes(sizeBytes)}</span>
    </div>
  );
}
