export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Not built yet — landing in {phase}. See progress.md for the full build plan.
      </p>
    </div>
  );
}
