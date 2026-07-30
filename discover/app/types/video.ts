export interface Video {
  id: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  views: string;
  viewsRaw: number;
  publishedAt: string;
  publishedAtRaw: Date;
  duration: string;
  outlierScore: number;
  thumbnailUrl: string;
  category: string;
  youtubeUrl: string;
  isShort?: boolean;
  channelId?: string;
}

