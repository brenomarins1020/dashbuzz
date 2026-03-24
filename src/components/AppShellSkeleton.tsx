import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard } from "lucide-react";

export function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="border-b border-primary/20 bg-primary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-accent/50 flex items-center justify-center">
                <LayoutDashboard className="h-4.5 w-4.5 text-accent" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-none tracking-[0.2em] uppercase text-primary-foreground font-heading">
                  PROJEC
                </h1>
                <p className="text-[10px] text-primary-foreground/50 mt-0.5 tracking-widest uppercase">
                  Marketing Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 bg-primary-foreground/10 rounded-md" />
              <Skeleton className="h-8 w-20 bg-primary-foreground/10 rounded-md" />
              <Skeleton className="h-9 w-28 bg-primary-foreground/10 rounded-md" />
              <Skeleton className="h-8 w-20 bg-primary-foreground/10 rounded-md" />
              <Skeleton className="h-8 w-20 bg-primary-foreground/10 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 bg-primary-foreground/10 rounded-md" />
          </div>
        </div>
      </header>

      {/* Content skeleton */}
      <main className="max-w-7xl mx-auto px-4 py-4 md:px-10 md:py-10 space-y-6 md:space-y-8">
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        {/* Calendar skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-sm" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
