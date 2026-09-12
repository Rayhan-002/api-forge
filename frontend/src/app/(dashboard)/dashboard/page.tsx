'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';

import { useAuthStore } from '@/store/auth-store';
import { useRequestBuilderStore } from '@/store/request-builder-store';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const resetDraft = useRequestBuilderStore((state) => state.resetDraft);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Welcome{user ? `, ${user.email}` : ''}.
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            You&apos;re signed in to API Forge. Collection/environment management and this
            dashboard&apos;s activity summary land in later phases — see{' '}
            <code className="rounded bg-surface-hover px-1 py-0.5 font-mono text-xs">
              progress.md
            </code>{' '}
            for the full build plan.
          </p>
        </div>
        <Link href="/workspace" onClick={() => resetDraft()}>
          <Button>
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>
    </div>
  );
}
