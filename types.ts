export type View = 'dashboard' | 'strategies' | 'education' | 'articles' | 'marketing' | 'licenses' | 'admin' | 'course_player' | 'settings' | 'article' | 'journey' | 'downloads' | 'treasury' | 'chat_moderation' | 'knowledge' | 'journal' | 'analysis' | 'live_portfolio' | 'market';

export type ProductType = 'ea' | 'course' | 'ebook' | 'indicator' | 'robot' | 'affiliate' | 'other';

export type UserRole = 'admin' | 'client' | 'partner' | 'first_mate';

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
  myfxbook_url?: string;
}

export interface Product {
    id: string;
    type: ProductType;
    title: string;
    description: string;
    image_url: string;
    external_link?: string;
    // Trava de conteudo (usada principalmente em cursos da Biblioteca)
    is_locked?: boolean;
    lock_note?: string;
    // Campos do Market
    price_label?: string;
    is_published?: boolean;
    category?: string;
    sort_order?: number;
    show_in_market?: boolean;
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
    description?: string;
}

export interface LicenseRequest {
    id: string;
    user_id: string;
    mt5_account: string;
    license_title?: string;
    status: 'pending' | 'approved' | 'rejected';
    expires_at?: string;
    notes?: string;
    created_at: string;
    profiles?: { full_name: string; email: string };
}

export interface LicenseTitle {
    id: string;
    name: string;
    created_at: string;
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
  content?: string;
  image_url?: string;
  gallery_urls?: string[];
  category?: string;
  date?: string;
  created_at?: string;
}

export interface MarketingAsset {
  id: string;
  title: string;
  type: 'PDF' | 'Slide' | 'Image' | 'Text';
  size: string;
  url: string;
  content?: string;
  image_url?: string;
}

export interface PartnerRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: { full_name: string; email: string };
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Prospect {
  id: string;
  partner_id?: string;
  full_name: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'negotiating' | 'converted' | 'lost';
  notes?: string;
  created_at: string;
}

export interface StrategyMt5Link {
  strategy_id: string;
  user_id: string;
  account_login: number;
  broker_display: string | null;
  api_key_prefix: string;
  api_key_created_at: string;
  api_key_revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyMt5Status {
  strategy_id: string;
  user_id: string;
  account_login: number;
  account_currency: string | null;
  account_company: string | null;
  account_server: string | null;
  balance: number | null;
  equity: number | null;
  floating_pnl: number | null;
  daily_pnl: number | null;
  open_positions: number | null;
  last_trade_at: string | null;
  ea_version: string | null;
  terminal_hash: string | null;
  reported_at: string;
  received_at: string;
  updated_at: string;
}