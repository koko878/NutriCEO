// Layout-matching skeletons for the initial data load (not spinners).
function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200/70 ${className}`} />;
}

export function ConsoSkeleton() {
  return (
    <div>
      <Block className="mb-3 h-8 w-80 max-w-full" />
      <Block className="mb-8 h-4 w-96 max-w-full" />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-zinc-200 bg-white p-5">
            <Block className="mb-4 h-3 w-24" />
            <Block className="h-9 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[7fr_3fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6">
          <Block className="mb-5 h-4 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Block key={i} className="mb-3 h-5 w-full" />
          ))}
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-6">
          <Block className="mb-5 h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="mb-3 h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div>
      <Block className="mb-3 h-8 w-72 max-w-full" />
      <Block className="mb-6 h-4 w-80 max-w-full" />
      <div className="rounded-2xl border border-zinc-200 bg-white p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Block key={i} className="mb-2 h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
