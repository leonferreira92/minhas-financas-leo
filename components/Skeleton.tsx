import React from 'react';

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`}></div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-8 pb-32 p-1">
    {/* Header Skeleton */}
    <div className="flex justify-between items-center pt-4">
      <div className="flex items-center space-x-3">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="w-16 h-2" />
          <Skeleton className="w-24 h-4" />
        </div>
      </div>
      <div className="flex space-x-2">
        <Skeleton className="w-10 h-10 rounded-2xl" />
        <Skeleton className="w-10 h-10 rounded-2xl" />
      </div>
    </div>

    {/* Hero Card Skeleton */}
    <Skeleton className="w-full h-64 rounded-[2.8rem]" />

    {/* Hub Skeleton */}
    <div className="grid grid-cols-3 gap-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-[2.2rem]" />
      ))}
    </div>

    {/* Actions Skeleton */}
    <div className="flex space-x-3">
      <Skeleton className="flex-1 h-14 rounded-[1.8rem]" />
      <Skeleton className="flex-1 h-14 rounded-[1.8rem]" />
    </div>

    {/* Recent Activities Skeleton */}
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="w-32 h-3" />
        <Skeleton className="w-16 h-3" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="w-full h-20 rounded-[2rem]" />
        ))}
      </div>
    </div>
  </div>
);
