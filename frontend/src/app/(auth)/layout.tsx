import { RedirectIfAuthenticated } from "@/components/auth/redirect-if-authenticated";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RedirectIfAuthenticated>
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <span className="font-mono text-lg font-semibold tracking-tight text-foreground">
              API<span className="text-accent"> Forge</span>
            </span>
          </div>
          <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </RedirectIfAuthenticated>
  );
}
