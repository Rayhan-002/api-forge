"use client";

import { useMutation } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { logout } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  const mutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearSession();
      router.replace("/login");
      toast.success("Signed out.");
    },
  });

  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-4 border-b border-border bg-surface px-4">
      <span className="text-sm text-muted-foreground">{user?.email}</span>
      <Button
        variant="ghost"
        onClick={() => mutation.mutate()}
        isLoading={mutation.isPending}
        className="!px-2"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
