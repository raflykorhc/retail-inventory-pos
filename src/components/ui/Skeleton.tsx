import React from "react";
import { cn } from "../../lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-skeleton rounded-md bg-border-default/50",
        className
      )}
      {...props}
    />
  );
}

export function StatsSkeleton({ count = 4, cardClassName }: { count?: number; cardClassName?: string }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "p-3 lg:p-6 rounded-[1.5rem] lg:rounded-3xl border border-border-default bg-bg-card shadow-sm h-full flex flex-col justify-between min-h-[85px] lg:min-h-[160px] w-full",
            cardClassName
          )}
        >
          <Skeleton className="w-7 h-7 lg:w-12 lg:h-12 rounded-lg lg:rounded-2xl" />
          <div className="space-y-2 lg:space-y-3 mt-auto">
            <Skeleton className="h-3 lg:h-4 w-20 lg:w-24 rounded-full opacity-60" />
            <Skeleton className="h-5 lg:h-8 w-24 lg:w-32 rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center space-x-4 p-4 lg:p-6 border-b border-border-subtle w-full">
      <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      {[...Array(cols - 1)].map((_, i) => (
        <Skeleton key={i} className="h-4 w-20 hidden lg:block" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-border-default rounded-[32px] p-8 space-y-4 bg-bg-card">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-6 w-3/4 mt-2" />
      </div>
    </div>
  );
}
