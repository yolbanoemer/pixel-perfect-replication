export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="brand-gradient elevated flex size-8 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
        T
      </span>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight">Terravest</span>
      )}
    </span>
  );
}
