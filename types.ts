export type View = 'strategies' | 'education' | 'marketing' | 'licenses';

export type UserRole = 'admin' | 'client' | 'partner';

export interface Robot {
  id: string;
  name: string;
  version: string;
  pair: string;
  status: 'active' | 'stopped';
  profitability: string;
  description?: string;
  images?: string[];
  manualImages?: string[];
}

export interface VideoContent {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  date: string;
}

export interface MarketingAsset {
  id: string;
  title: string;
  type: 'PDF' | 'Slide' | 'Image';
  size: string;
}