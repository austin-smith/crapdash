export const LAYOUTS = {
  ROWS: 'rows',
  COLUMNS: 'columns',
} as const;

export type DashboardLayout = typeof LAYOUTS[keyof typeof LAYOUTS];

export const LAYOUT_COOKIE_NAME = 'dashboard-layout';
export const DEFAULT_LAYOUT: DashboardLayout = LAYOUTS.ROWS;

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
  icon?: string;
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
