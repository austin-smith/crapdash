import { type AppearanceSetting, DEFAULT_APPEARANCE } from './appearance-config';

export const LAYOUTS = {
  ROWS: 'rows',
  COLUMNS: 'columns',
} as const;

export type DashboardLayout = typeof LAYOUTS[keyof typeof LAYOUTS];

export const DEFAULT_LAYOUT: DashboardLayout = LAYOUTS.ROWS;
export const PREFERENCES_COOKIE_NAME = 'preferences';
export const DEFAULT_APP_TITLE = 'crapdash';
export const SERVICE_NAME_MAX_LENGTH = 100;
export const SERVICE_DESCRIPTION_MAX_LENGTH = 500;

export interface Preferences {
  layout: DashboardLayout;
  expandOnHover: boolean;
  appearance: AppearanceSetting;
  openLinksInNewTab: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  layout: DEFAULT_LAYOUT,
  expandOnHover: false,
  appearance: DEFAULT_APPEARANCE,
  openLinksInNewTab: true,
};

export const SEARCH_ENGINES = {
  DUCKDUCKGO: 'duckduckgo',
  GOOGLE: 'google',
  KAGI: 'kagi',
  BING: 'bing',
  CUSTOM: 'custom',
  NONE: 'none',
} as const;

export type SearchEngine = typeof SEARCH_ENGINES[keyof typeof SEARCH_ENGINES];

export const DEFAULT_SEARCH_ENGINE: SearchEngine = SEARCH_ENGINES.DUCKDUCKGO;
export const SEARCH_QUERY_PLACEHOLDER = '%s';
export const SEARCH_BANG_PREFIX = '!';

export const ICON_TYPES = {
  IMAGE: 'image',
  ICON: 'icon',
  EMOJI: 'emoji',
} as const;

export type IconType = typeof ICON_TYPES[keyof typeof ICON_TYPES];

export interface IconConfig {
  type: IconType;
  value: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: IconConfig;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  url: string;
  categoryId: string;
  icon?: IconConfig;
  active: boolean;
}

export interface SearchBang {
  /** Typed after "!" in the search box, stored without it (e.g. "gh") */
  trigger: string;
  name: string;
  url: string;
}

export interface SearchSettings {
  engine: SearchEngine;
  customUrl?: string;
  /** Omitted means the default bangs; an empty list turns bangs off */
  bangs?: SearchBang[];
}

export type SearchEngineSettings = Omit<SearchSettings, 'bangs'>;

export interface DashboardConfig {
  appTitle?: string;
  appLogo?: IconConfig;
  search?: SearchSettings;
  categories: Category[];
  services: Service[];
}

export interface ImportWarning {
  field: string;
  message: string;
}

export interface ImportConfigResult {
  warnings: ImportWarning[];
  config: DashboardConfig;
}

export type CategoryFormData = Omit<Category, 'id'>;
export type CategoryCreateData = Category;
export type ServiceFormData = Omit<Service, 'id'>;
export type ServiceCreateData = Service & {
  fetchFavicon?: boolean;
};

export interface ValidationError {
  field: string;
  message: string;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };
