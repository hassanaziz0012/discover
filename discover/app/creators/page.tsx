"use client";

import React, { useState, useMemo, useEffect } from "react";
import TabNavigation from "@/app/components/TabNavigation";
import SearchBar from "@/app/components/SearchBar";
import CreatorsList, { Creator } from "@/app/components/CreatorsList";
import CreatorsHeader from "@/app/components/CreatorsHeader";
import ListPills from "@/app/components/ListPills";
import ManageListsModal from "@/app/components/ManageListsModal";
import EditListModal from "@/app/components/EditListModal";
import RefreshReportModal, { RefreshReport } from "@/app/components/RefreshReportModal";
import { UserList } from "@/app/types/list";
import { API_BASE_URL } from "@/app/utils/constants";

export default function CreatorsPage() {
  // Navigation & Filtering States
  const [topSearchQuery, setTopSearchQuery] = useState("");
  const [channelSearchQuery, setChannelSearchQuery] = useState("");

  // Lists States
  const [lists, setLists] = useState<UserList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [activeManageListCreator, setActiveManageListCreator] = useState<Creator | null>(null);
  const [isEditListModalOpen, setIsEditListModalOpen] = useState(false);

  // SearchBar dummy state values for UI consistency
  const [platform] = useState("YouTube");
  const [timeRange] = useState("all");
  const [minOutlier] = useState(1.5);
  const [excludeShorts] = useState(false);

  // Layout preference
  const [creatorsLayout, setCreatorsLayoutState] = useState<"list" | "grid">("list");

  const setCreatorsLayout = (val: "list" | "grid") => {
    setCreatorsLayoutState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("discover_creatorsLayout", val);
    }
  };

  // Load saved preferences on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCreatorsLayout = localStorage.getItem("discover_creatorsLayout");
      if (savedCreatorsLayout === "list" || savedCreatorsLayout === "grid") {
        setCreatorsLayoutState(savedCreatorsLayout);
      }
    }
    fetchLists();
    fetchCreators();
  }, []);

  // Creators API States
  const [creators, setCreators] = useState<Creator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [creatorsError, setCreatorsError] = useState<string | null>(null);

  // Fetch cached creators from backend API
  async function fetchCreators() {
    setCreatorsLoading(true);
    setCreatorsError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/cached-creators`);
      if (response.ok) {
        const data = await response.json();
        setCreators(data);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setCreatorsError(errJson.detail || `Failed to fetch creators (Server status: ${response.status})`);
      }
    } catch (err) {
      console.error("Fetch creators error:", err);
      setCreatorsError("Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.");
    } finally {
      setCreatorsLoading(false);
    }
  }

  // Refresh Creators States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [refreshReport, setRefreshReport] = useState<RefreshReport | null>(null);

  // Sync Subscriptions States
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncSubscriptions = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setRefreshStatus(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/sync-subscriptions`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.creators) {
          setCreators(data.creators);
        }
        setRefreshReport({
          title: "Subscription Sync Complete",
          subtitle: "Summary of subscription channel updates",
          message: data.message || "Successfully synced all subscribed channels.",
          refreshed: data.refreshed || [],
          errors: data.errors || [],
        });
        setIsRefreshModalOpen(true);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setRefreshStatus({
          type: "error",
          message: errJson.detail || `Failed to sync subscriptions (Server status: ${response.status})`,
        });
      }
    } catch (err) {
      console.error("Sync subscriptions error:", err);
      setRefreshStatus({
        type: "error",
        message: "Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshCreators = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshStatus(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/refresh-creators`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.creators) {
          setCreators(data.creators);
        }
        setRefreshReport({
          message: data.message || "Successfully refreshed all channels.",
          refreshed: data.refreshed || [],
          errors: data.errors || [],
        });
        setIsRefreshModalOpen(true);
      } else {
        const errJson = await response.json().catch(() => ({}));
        setRefreshStatus({
          type: "error",
          message: errJson.detail || `Failed to refresh channels (Server status: ${response.status})`,
        });
      }
    } catch (err) {
      console.error("Refresh creators error:", err);
      setRefreshStatus({
        type: "error",
        message: "Unable to connect to the backend server. Please verify that the uvicorn server is running on port 8000.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (refreshStatus && refreshStatus.type === "success") {
      const timer = setTimeout(() => {
        setRefreshStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [refreshStatus]);

  // Fetch customized lists from backend API
  async function fetchLists() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/lists`);
      if (response.ok) {
        const data = await response.json();
        setLists(data);
      }
    } catch (err) {
      console.error("Failed to fetch lists:", err);
    }
  }

  // Create new list in backend
  const handleCreateList = async (name: string) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      const newList = await response.json();
      setLists((prev) => [...prev, newList]);
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || "Failed to create list.");
    }
  };

  // Toggle channel in list (Add/Remove)
  const handleToggleListChannel = async (listId: string, channelId: string, isChecked: boolean) => {
    let response;
    if (isChecked) {
      response = await fetch(`${API_BASE_URL}/api/youtube/lists/${listId}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: channelId }),
      });
    } else {
      response = await fetch(`${API_BASE_URL}/api/youtube/lists/${listId}/channels/${channelId}`, {
        method: "DELETE",
      });
    }

    if (response.ok) {
      fetchLists();
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || "Failed to update list membership.");
    }
  };

  // Delete list
  const handleDeleteList = async (listId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/lists/${listId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      if (selectedListId === listId) {
        setSelectedListId("all");
      }
      setLists((prev) => prev.filter((l) => l.id !== listId));
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || "Failed to delete list.");
    }
  };

  // Delete channel from cache
  const handleDeleteChannel = async (channelId: string) => {
    setRefreshStatus(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/creators/${channelId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setCreators((prev) => prev.filter((c) => c.channel_id !== channelId));
        setRefreshStatus({
          type: "success",
          message: "Successfully deleted channel from cache.",
        });
        fetchLists(); // Sync lists configuration
      } else {
        const errJson = await response.json().catch(() => ({}));
        setRefreshStatus({
          type: "error",
          message: errJson.detail || "Failed to delete channel.",
        });
      }
    } catch (err) {
      console.error("Delete channel error:", err);
      setRefreshStatus({
        type: "error",
        message: "Unable to connect to the backend server.",
      });
    }
  };


  // Update list name and channels
  const handleUpdateList = async (listId: string, name: string, channelIds: string[]) => {
    const response = await fetch(`${API_BASE_URL}/api/youtube/lists/${listId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, channels: channelIds }),
    });
    if (response.ok) {
      const updatedList = await response.json();
      setLists((prev) => prev.map((l) => (l.id === listId ? updatedList : l)));
    } else {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.detail || "Failed to update list.");
    }
  };

  // High-fidelity search filter for cached creators
  const filteredCreators = useMemo(() => {
    if (!channelSearchQuery.trim()) return creators;
    const q = channelSearchQuery.toLowerCase().trim();
    return creators.filter(
      (c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q)
    );
  }, [creators, channelSearchQuery]);

  // Filter creators by selected list tag pill
  const displayedCreators = useMemo(() => {
    if (selectedListId === "all") return filteredCreators;
    const activeList = lists.find((l) => l.id === selectedListId);
    if (!activeList) return [];
    return filteredCreators.filter((c) => activeList.channels.includes(c.channel_id));
  }, [filteredCreators, selectedListId, lists]);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 min-h-screen flex flex-col">
      {/* Search Input Bar (Top Section) */}
      <SearchBar
        searchQuery={topSearchQuery}
        setSearchQuery={setTopSearchQuery}
        onOpenFilters={() => {}} // No filters modal needed on creators list page
        activePlatform={platform}
        activeTimeRange={timeRange}
        activeMinOutlier={minOutlier}
        activeExcludeShorts={excludeShorts}
      />

      {/* Tab Horizontal Navigation (Discover, Channels, Thumbnail Preview) */}
      <TabNavigation activeTab="creators" />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {creators.length > 0 && !creatorsLoading && (
          <CreatorsHeader
            creatorsLayout={creatorsLayout}
            setCreatorsLayout={setCreatorsLayout}
            isRefreshing={isRefreshing}
            onRefresh={handleRefreshCreators}
            isSyncing={isSyncing}
            onSync={handleSyncSubscriptions}
            refreshStatus={refreshStatus}
            setRefreshStatus={setRefreshStatus}
            channelSearchQuery={channelSearchQuery}
            setChannelSearchQuery={setChannelSearchQuery}
          >
            {/* List Selection Pill Tags */}
            {!creatorsError && (
              <ListPills
                lists={lists}
                selectedListId={selectedListId}
                onSelectListId={setSelectedListId}
                creators={creators}
                onManageListClick={() => setIsEditListModalOpen(true)}
              />
            )}
          </CreatorsHeader>
        )}

        <CreatorsList
          creators={displayedCreators}
          isLoading={creatorsLoading}
          error={creatorsError}
          onRetry={fetchCreators}
          layout={creatorsLayout}
          onManageLists={setActiveManageListCreator}
          onDeleteChannel={handleDeleteChannel}
        />
      </main>

      {/* Refresh Report Modal */}
      <RefreshReportModal
        isOpen={isRefreshModalOpen}
        onClose={() => setIsRefreshModalOpen(false)}
        report={refreshReport}
      />

      {/* Manage Lists Modal Overlay */}
      <ManageListsModal
        isOpen={activeManageListCreator !== null}
        onClose={() => setActiveManageListCreator(null)}
        creator={activeManageListCreator}
        lists={lists}
        onToggleList={handleToggleListChannel}
        onCreateList={handleCreateList}
        onDeleteList={handleDeleteList}
      />

      {/* Edit List Modal Overlay */}
      <EditListModal
        isOpen={isEditListModalOpen}
        onClose={() => setIsEditListModalOpen(false)}
        list={lists.find((l) => l.id === selectedListId) || null}
        allCreators={creators}
        onUpdateList={handleUpdateList}
        onDeleteList={handleDeleteList}
      />
    </div>
  );
}
