export type View = 'dashboard' | 'strategies' | 'education' | 'articles' | 'marketing' | 'licenses' | 'admin' | 'course_player' | 'settings' | 'article' | 'journey' | 'downloads' | 'treasury' | 'chat_moderation' | 'knowledge' | 'journal' | 'analysis' | 'live_portfolio' | 'market' | 'hand_bot' | 'trilha_gain' | 'signals' | 'crypto' | 'econ_calendar' | 'live_room';

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

// ============================================================
// Trilha Gain — aprendizado gamificado (Duolingo-style)
// ============================================================

export type TrilhaStepType = 'concept' | 'quiz' | 'truefalse' | 'order' | 'chart';

// Payloads por tipo de step (armazenados em trilha_steps.payload jsonb)
export interface ConceptPayload {
  title: string;
  body: string;
  image_url?: string;
}
export interface QuizPayload {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}
export interface TrueFalsePayload {
  statement: string;
  answer: boolean;
  explanation?: string;
}
export interface OrderPayload {
  prompt: string;
  items: string[]; // ordem correta
}
export interface ChartPayload {
  image_url: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export type TrilhaStepPayload =
  | ConceptPayload | QuizPayload | TrueFalsePayload | OrderPayload | ChartPayload;

export interface TrilhaStep {
  id: string;
  lesson_id: string;
  type: TrilhaStepType;
  payload: TrilhaStepPayload;
  order_index: number;
  created_at?: string;
}

export interface TrilhaLesson {
  id: string;
  unit_id: string;
  title: string;
  icon?: string;
  xp_reward: number;
  order_index: number;
  created_at?: string;
  steps?: TrilhaStep[];
}

export interface TrilhaUnit {
  id: string;
  track_id: string;
  title: string;
  subtitle?: string;
  color?: string;
  image_url?: string;
  // Bloqueio por unidade (unidade paga): cadeado + lições não abrem.
  is_locked?: boolean;
  lock_note?: string;
  // Custo em XP para destravar a unidade (NULL/0 = não resgatável por XP).
  unlock_cost?: number;
  order_index: number;
  created_at?: string;
  lessons?: TrilhaLesson[];
}

export interface TrilhaTrack {
  id: string;
  title: string;
  description?: string;
  image_url?: string;
  icon?: string;
  color?: string;
  is_published: boolean;
  sort_order: number;
  // Acesso: is_locked=true → trilha paga (cadeado + modal). Default false = gratuita.
  is_locked?: boolean;
  lock_note?: string;
  price_label?: string;
  created_at?: string;
  updated_at?: string;
  units?: TrilhaUnit[];
}

export interface TrilhaProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  score: number;
  completed_at: string;
}

// ============================================================
// Sinais — sinais de compra/venda (XAU/USD e futuros símbolos)
// ============================================================

export type SignalSource = 'auto' | 'setup';
// 'NONE' = análise sem setup de entrada (só parecer).
export type SignalAction = 'BUY' | 'SELL' | 'NONE';
export type SignalStatus = 'open' | 'hit_tp' | 'hit_sl' | 'cancelled';

export interface Signal {
  id: string;
  source: SignalSource;
  // Dono do sinal 'auto' (privado). NULL em sinais 'setup' (públicos do time).
  user_id: string | null;
  symbol: string;
  action: SignalAction;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  status: SignalStatus;
  timeframe: string | null;
  // Parecer textual entregue em toda análise (com ou sem entrada).
  analysis: string | null;
  rationale: string | null;
  confidence: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrilhaStats {
  id: string;
  user_id: string;
  total_xp: number;
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
  badges: string[];
  updated_at?: string;
}