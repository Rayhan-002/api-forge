import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
}

export function StatTile({ icon: Icon, label, value, href }: StatTileProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 transition-colors hover:bg-surface-hover"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}
