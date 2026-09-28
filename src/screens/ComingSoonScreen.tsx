export function ComingSoonScreen({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground text-sm">Coming soon.</p>
    </div>
  );
}
