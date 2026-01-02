import { cookies } from 'next/headers';
import { getCategories, getActiveServices } from '@/lib/db';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import {
  LAYOUTS,
  SETTINGS_COOKIE_NAME,
  type DashboardSettings,
} from '@/lib/types';

function parseSettings(cookieValue: string | undefined): Partial<DashboardSettings> {
  if (!cookieValue) return {};
  
  try {
    const parsed = JSON.parse(cookieValue);
    const settings: Partial<DashboardSettings> = {};
    
    // Validate layout
    if (parsed.layout === LAYOUTS.ROWS || parsed.layout === LAYOUTS.COLUMNS) {
      settings.layout = parsed.layout;
    }
    
    // Validate expandOnHover
    if (typeof parsed.expandOnHover === 'boolean') {
      settings.expandOnHover = parsed.expandOnHover;
    }
    
    return settings;
  } catch {
    return {};
  }
}

export default async function Page() {
  const [categories, services, cookieStore] = await Promise.all([
    getCategories(),
    getActiveServices(),
    cookies(),
  ]);

  const settingsValue = cookieStore.get(SETTINGS_COOKIE_NAME)?.value;
  const initialSettings = parseSettings(settingsValue);

  return (
    <DashboardClient
      categories={categories}
      services={services}
      initialSettings={initialSettings}
    />
  );
}
