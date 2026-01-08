import { type AppearanceSetting, DEFAULT_APPEARANCE } from './appearance-config';

export const LAYOUTS = {
  ROWS: 'rows',
  COLUMNS: 'columns',
} as const;

export type DashboardLayout = typeof LAYOUTS[keyof typeof LAYOUTS];

export const DEFAULT_LAYOUT: DashboardLayout = LAYOUTS.ROWS;
export const PREFERENCES_COOKIE_NAME = 'preferences';

export interface Preferences {
  layout: DashboardLayout;
  expandOnHover: boolean;
  appearance: AppearanceSetting;
}

export const DEFAULT_PREFERENCES: Preferences = {
  layout: DEFAULT_LAYOUT,
  expandOnHover: false,
  appearance: DEFAULT_APPEARANCE,
};

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

export interface DashboardConfig {
  categories: Category[];
  services: Service[];
}

export type CategoryFormData = Omit<Category, 'id'>;
export type CategoryCreateData = Category;
export type ServiceFormData = Omit<Service, 'id'>;
export type ServiceCreateData = Service;

export interface ValidationError {
  field: string;
  message: string;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };
