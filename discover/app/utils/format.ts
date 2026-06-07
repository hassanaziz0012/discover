// Helper: Format large numbers to human-readable views (e.g. 1.2M, 45K)
export function formatViews(views: number): string {
  if (views === undefined || views === null) return "0 views";
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1).replace(/\.0$/, "")}K views`;
  }
  return `${views} views`;
}

// Helper: Convert ISO 8601 duration (e.g., PT15M33S) into standard format (e.g., 15:33)
export function formatDuration(isoDuration: string): string {
  if (!isoDuration) return "0:00";
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return isoDuration;
  const hrs = matches[1] ? parseInt(matches[1]) : 0;
  const mins = matches[2] ? parseInt(matches[2]) : 0;
  const secs = matches[3] ? parseInt(matches[3]) : 0;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Helper: Relative time ago (e.g., 2mo ago, 12d ago)
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1mo ago";
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffMonths / 12);
  if (diffYears === 1) return "1yr ago";
  return `${diffYears}yr ago`;
}
