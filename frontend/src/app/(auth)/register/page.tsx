"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { register as registerRequest } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: registerRequest,
    onSuccess: (data) => {
      setSession(data.access, data.user);
      toast.success("Account created.");
      router.replace("/dashboard");
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setClientError(null);

    if (password !== passwordConfirm) {
      setClientError("Passwords do not match.");
      return;
    }

    mutation.mutate({ email, password, password_confirm: passwordConfirm });
  }

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? "Something went wrong." : null;
  const errorMessage = clientError ?? serverError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-lg font-semibold text-foreground">Create an account</h1>
        <p className="text-sm text-muted-foreground">Start building requests in API Forge.</p>
      </div>

      <Field
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="At least 8 characters."
      />
      <Field
        label="Confirm password"
        type="password"
        name="password_confirm"
        autoComplete="new-password"
        required
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
      />

      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

      <Button type="submit" isLoading={mutation.isPending} className="mt-2 w-full">
        {mutation.isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
          Sign in
        </Link>
      </p>
    </form>
  );
}
