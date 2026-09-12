'use client';

import { FolderKanban, Globe, History, LayoutDashboard, Settings, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils/cn';
import { useRequestBuilderStore } from '@/store/request-builder-store';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  // Resets the draft: this link means "start a blank request," distinct
  // from navigating to /workspace with fields already populated (loading a
  // saved request, restoring from history).
  { label: 'Workspace', href: '/workspace', icon: Zap, resetsDraft: true },
  { label: 'Collections', href: '/collections', icon: FolderKanban },
  { label: 'Environments', href: '/environments', icon: Globe },
  { label: 'History', href: '/history', icon: History },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const resetDraft = useRequestBuilderStore((state) => state.resetDraft);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
          API<span className="text-accent"> Forge</span>
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ label, href, icon: Icon, resetsDraft }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={resetsDraft ? () => resetDraft() : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
