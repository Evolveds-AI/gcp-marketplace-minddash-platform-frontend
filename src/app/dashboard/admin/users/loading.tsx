import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-border last:border-0 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
