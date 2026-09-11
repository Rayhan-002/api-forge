"use client";

import { useAuthStore } from "@/store/auth-store";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-foreground">Welcome{user ? `, ${user.email}` : ""}.</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You&apos;re signed in to API Forge. The request builder, response viewer, and dashboard
        activity summary land in the next phases — see{" "}
        <code className="rounded bg-surface-hover px-1 py-0.5 font-mono text-xs">progress.md</code>{" "}
        for the full build plan.
      </p>
    </div>
  );
}
