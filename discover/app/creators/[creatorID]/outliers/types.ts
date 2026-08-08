export interface ApiOutlier {
  video_id: string;
  title: string;
  description: string;
  published_at: string;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: string;
  url: string;
  score: number;
  base_score: number;
  view_ratio: number;
  like_ratio: number;
  view_diff: number;
  like_diff: number;
  age_in_days: number;
  is_boosted: boolean;
  is_short?: boolean;
}

export interface ApiResponse {
  channel_name: string;
  channel_id: string;
  channel_avatar: string | null;
  channel_description?: string;
  total_videos: number;
  average_views: number;
  average_likes: number;
  outliers: ApiOutlier[];
  total_outliers: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
