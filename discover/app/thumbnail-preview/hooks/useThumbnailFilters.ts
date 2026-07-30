import { useState, useEffect } from "react";

export function useThumbnailFilters() {
  const [searchQuery, setSearchQuery] = useState("");
  const [outlierSearchQuery, setOutlierSearchQuery] = useState("");
  const [platform, setPlatformState] = useState("YouTube");
  const [timeRange, setTimeRangeState] = useState("all");
  const [minOutlier, setMinOutlierState] = useState(1.5);
  const [sortBy, setSortByState] = useState("outlierScore");
  const [excludeShorts, setExcludeShortsState] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isFiltersLoaded, setIsFiltersLoaded] = useState(false);

  // Custom setters that update both state and localStorage
  const setPlatform = (val: string) => {
    setPlatformState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_platform", val);
    }
  };

  const setTimeRange = (val: string) => {
    setTimeRangeState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_timeRange", val);
    }
  };

  const setMinOutlier = (val: number) => {
    setMinOutlierState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_minOutlier", val.toString());
    }
  };

  const setSortBy = (val: string) => {
    setSortByState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_sortBy", val);
    }
  };

  const setExcludeShorts = (val: boolean) => {
    setExcludeShortsState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_excludeShorts", val.toString());
    }
  };

  // Load saved filters on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPlatform = localStorage.getItem("discover_platform");
      const savedTimeRange = localStorage.getItem("discover_timeRange");
      const savedMinOutlier = localStorage.getItem("discover_minOutlier");
      const savedSortBy = localStorage.getItem("discover_sortBy");
      const savedExcludeShorts = localStorage.getItem("discover_excludeShorts");

      if (savedPlatform) setPlatformState(savedPlatform);
      if (savedTimeRange) setTimeRangeState(savedTimeRange);
      if (savedMinOutlier) {
        const parsed = parseFloat(savedMinOutlier);
        if (!isNaN(parsed)) setMinOutlierState(parsed);
      }
      if (savedSortBy) setSortByState(savedSortBy);
      if (savedExcludeShorts) setExcludeShortsState(savedExcludeShorts === "true");
    }
    setIsFiltersLoaded(true);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    outlierSearchQuery,
    setOutlierSearchQuery,
    platform,
    setPlatform,
    timeRange,
    setTimeRange,
    minOutlier,
    setMinOutlier,
    sortBy,
    setSortBy,
    excludeShorts,
    setExcludeShorts,
    isFilterModalOpen,
    setIsFilterModalOpen,
    isFiltersLoaded,
  };
}
