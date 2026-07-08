export const DEFAULT_PLACEHOLDER_BG = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)";

export interface OutlierBadgeStyle {
  background: string;
  color: string;
  border: string;
  label: string;
}

export const getOutlierBadgeStyles = (score: number, previewTheme: "dark" | "light"): OutlierBadgeStyle => {
  if (score >= 100) {
    return {
      background: "rgba(220, 38, 38, 0.15)",
      color: "#DC2626",
      border: "1px solid rgba(220, 38, 38, 0.3)",
      label: "Extreme Outlier"
    };
  } else if (score >= 30) {
    return {
      background: "rgba(217, 119, 6, 0.15)",
      color: "#D97706",
      border: "1px solid rgba(217, 119, 6, 0.3)",
      label: "High Outlier"
    };
  } else if (score >= 10) {
    return {
      background: "rgba(245, 158, 11, 0.12)",
      color: "#F59E0B",
      border: "1px solid rgba(245, 158, 11, 0.25)",
      label: "Mid Outlier"
    };
  } else {
    return {
      background: previewTheme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
      color: previewTheme === "dark" ? "#a1a1aa" : "#71717a",
      border: previewTheme === "dark" ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.1)",
      label: "Low Outlier"
    };
  }
};
