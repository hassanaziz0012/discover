import React from "react";

export function OutliersSkeleton() {
  return (
    <div className="flex-1 flex flex-col animate-pulse">
      {/* Header Skeleton */}
      <div className="flex sm:flex-row flex-col sm:items-start items-start gap-6 pb-6 border-b border-border-subtle mb-8">
        <div className="w-20 h-20 rounded-full bg-surface-raised mt-1"></div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-8 w-48 bg-surface-raised rounded-md"></div>
          <div className="h-5 w-72 bg-surface-raised rounded-md"></div>
          <div className="h-4 w-full max-w-[500px] bg-surface-raised rounded-md mt-1"></div>
          <div className="h-4 w-2/3 max-w-[400px] bg-surface-raised rounded-md"></div>
        </div>
        <div className="flex gap-3 sm:mt-0 mt-4">
          <div className="w-28 h-20 bg-surface-raised rounded-xl"></div>
          <div className="w-28 h-20 bg-surface-raised rounded-xl"></div>
          <div className="w-28 h-20 bg-surface-raised rounded-xl"></div>
        </div>
      </div>
      {/* Filters Skeleton */}
      <div className="h-24 bg-surface-raised rounded-2xl mb-8"></div>
      {/* Grid Skeleton */}
      <div className="grid sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] grid-cols-1 gap-5 mb-12">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="aspect-video w-full bg-surface-raised rounded-lg"></div>
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-surface-raised shrink-0"></div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 bg-surface-raised rounded-md w-full"></div>
                <div className="h-4 bg-surface-raised rounded-md w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
