import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "@/app/utils/constants";

export function useChannelCustomizer() {
  // View States
  const [viewMode, setViewMode] = useState<"youtube" | "size">("youtube");
  const [previewLayout, setPreviewLayout] = useState<"desktop-grid" | "search-page" | "desktop-list" | "mobile">("desktop-grid");
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light">("dark");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Thumbnail Customizer States
  const [videoTitle, setVideoTitle] = useState("");
  const [duration, setDuration] = useState("13:20");
  const [views, setViews] = useState("7 views");
  const [relativeTime, setRelativeTime] = useState("1 day ago");
  const [outlierScore, setOutlierScore] = useState<number>(0);
  const [customImageSrc, setCustomImageSrc] = useState<string | null>(null);

  // Database Synced Channel States
  const [channelName, setChannelName] = useState("Phantom Creator");
  const [channelUrl, setChannelUrl] = useState("https://youtube.com/@phantomcreator");
  const [profilePicture, setProfilePicture] = useState("");
  const [dbChannel, setDbChannel] = useState({
    name: "Phantom Creator",
    url: "https://youtube.com/@phantomcreator",
    profile_picture: ""
  });
  const [dbSaving, setDbSaving] = useState(false);
  const [dbSaveSuccess, setDbSaveSuccess] = useState(false);

  // Fetch channel details from local API database on mount
  useEffect(() => {
    async function loadChannelDetails() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/youtube/channel`);
        if (res.ok) {
          const data = await res.json();
          setChannelName(data.name || "Phantom Creator");
          setChannelUrl(data.url || "https://youtube.com/@phantomcreator");
          setProfilePicture(data.profile_picture || "");
          setDbChannel(data);
        }
      } catch (err) {
        console.error("Failed to load channel details from API database:", err);
      }
    }
    loadChannelDetails();
  }, []);

  // Set theme based on OS preference on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setPreviewTheme(mediaQuery.matches ? "dark" : "light");
      
      const handler = (e: MediaQueryListEvent) => {
        setPreviewTheme(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setCustomImageSrc(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Backend channel persist request
  const handleSaveChannelToDb = async () => {
    setDbSaving(true);
    setDbSaveSuccess(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/youtube/channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: channelName,
          url: channelUrl,
          profile_picture: profilePicture
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDbChannel(data);
        setDbSaveSuccess(true);
        setTimeout(() => setDbSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save channel details to backend database:", err);
    } finally {
      setDbSaving(false);
    }
  };

  // Reset helper
  const resetCustomizerFields = () => {
    setVideoTitle("");
    setDuration("13:20");
    setViews("7 views");
    setRelativeTime("1 day ago");
    setOutlierScore(0);
    setCustomImageSrc(null);
    setChannelName(dbChannel.name);
    setChannelUrl(dbChannel.url);
    setProfilePicture(dbChannel.profile_picture);
    const isDarkMode = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)").matches : true;
    setPreviewTheme(isDarkMode ? "dark" : "light");
  };

  return {
    viewMode,
    setViewMode,
    previewLayout,
    setPreviewLayout,
    previewTheme,
    setPreviewTheme,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    videoTitle,
    setVideoTitle,
    duration,
    setDuration,
    views,
    setViews,
    relativeTime,
    setRelativeTime,
    outlierScore,
    setOutlierScore,
    customImageSrc,
    setCustomImageSrc,
    channelName,
    setChannelName,
    channelUrl,
    setChannelUrl,
    profilePicture,
    setProfilePicture,
    dbChannel,
    dbSaving,
    dbSaveSuccess,
    handleImageUpload,
    handleSaveChannelToDb,
    resetCustomizerFields,
  };
}
