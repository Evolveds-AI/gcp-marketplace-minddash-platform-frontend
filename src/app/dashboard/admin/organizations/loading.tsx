import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizationsLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-4 w-full" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border-b border-border last:border-0 flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
