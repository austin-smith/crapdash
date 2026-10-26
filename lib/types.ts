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

export const WIDGET_TYPES = {
  CLOCK: 'clock',
  WEATHER: 'weather',
} as const;

export type WidgetType = typeof WIDGET_TYPES[keyof typeof WIDGET_TYPES];

export const CLOCK_HOUR_CYCLES = {
  H12: '12h',
  H24: '24h',
} as const;

export type ClockHourCycle = typeof CLOCK_HOUR_CYCLES[keyof typeof CLOCK_HOUR_CYCLES];

export interface ClockWidgetSettings {
  type: typeof WIDGET_TYPES.CLOCK;
  /** Omit to use the browser locale's default. */
  hourCycle?: ClockHourCycle;
  /** IANA time zone name. Omit to use the browser's time zone. */
  timeZone?: string;
  showSeconds?: boolean;
  showDate?: boolean;
}

export const WEATHER_UNITS = {
  METRIC: 'metric',
  IMPERIAL: 'imperial',
} as const;

export type WeatherUnits = typeof WEATHER_UNITS[keyof typeof WEATHER_UNITS];

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface WeatherWidgetSettings {
  type: typeof WIDGET_TYPES.WEATHER;
  location: WeatherLocation;
  units: WeatherUnits;
}

/** Type-specific widget options, discriminated by `type`. */
export type WidgetSettings = ClockWidgetSettings | WeatherWidgetSettings;

export type Widget = WidgetSettings & {
  id: string;
  enabled: boolean;
};

export type WidgetOfType<T extends WidgetType> = Extract<Widget, { type: T }>;

export interface DashboardConfig {
  appTitle?: string;
  appLogo?: IconConfig;
  categories: Category[];
  services: Service[];
  widgets?: Widget[];
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
