export const LAYOUTS = {
  ROWS: 'rows',
  COLUMNS: 'columns',
} as const;

export type DashboardLayout = typeof LAYOUTS[keyof typeof LAYOUTS];

export const DEFAULT_LAYOUT: DashboardLayout = LAYOUTS.ROWS;
export const SETTINGS_COOKIE_NAME = 'dashboard-settings';

export interface DashboardSettings {
  layout: DashboardLayout;
  expandOnHover: boolean;
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  layout: DEFAULT_LAYOUT,
  expandOnHover: false,
};

export const ICON_TYPES = {
  IMAGE: 'image',
  ICON: 'icon',
} as const;

export type IconType = typeof ICON_TYPES[keyof typeof ICON_TYPES];

export interface IconConfig {
  type: IconType;
  value: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
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
export type ServiceFormData = Omit<Service, 'id'>;
export type ServiceCreateData = Service;

export interface ValidationError {
  field: string;
  message: string;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };
