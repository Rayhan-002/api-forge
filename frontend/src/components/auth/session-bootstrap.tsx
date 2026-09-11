'use client';

import { useEffect } from 'react';

import { bootstrapSession } from '@/lib/auth/session';

/** Fires the one-time silent-refresh session check on initial app load. */
export function SessionBootstrap() {
  useEffect(() => {
    void bootstrapSession();
  }, []);

  return null;
}
