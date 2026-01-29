export type View = 'dashboard' | 'strategies' | 'education' | 'marketing' | 'licenses' | 'admin' | 'course_player' | 'settings';

export type UserRole = 'admin' | 'client' | 'partner';

export interface Robot {
  id: string;
  name: string;
  version: string;
  pair: string;
  status: string; // Broker name
  profitability: string;
  description?: string;
  images?: string[];
  manualImages?: string[];
  avatar_url?: string;
  external_url?: string;
}

export interface Product {
    id: string;
    type: 'ea' | 'course';
    title: string;
    description: string;
    image_url: string;
    external_link?: string;
}

export interface Module {
    id: string;
    product_id: string;
    title: string;
    order_index: number;
    lessons?: Lesson[];
}

export interface Lesson {
    id: string;
    module_id: string;
    title: string;
    video_url: string;
    duration: string;
    is_free: boolean;
    order_index: number;
}

export interface LicenseRequest {
    id: string;
    user_id: string;
    mt5_account: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    profiles?: { full_name: string; email: string };
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