import { cookies } from 'next/headers';
import { getCategories, getServices } from '@/lib/db';
import { AdminClient } from '@/components/admin/admin-client';
import { LAYOUTS, SETTINGS_COOKIE_NAME, type DashboardSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

function parseSettings(cookieValue: string | undefined): Partial<DashboardSettings> {
  if (!cookieValue) return {};
  
  try {
    const parsed = JSON.parse(cookieValue);
    const settings: Partial<DashboardSettings> = {};
    
    if (parsed.layout === LAYOUTS.ROWS || parsed.layout === LAYOUTS.COLUMNS) {
      settings.layout = parsed.layout;
    }
    
    if (typeof parsed.expandOnHover === 'boolean') {
      settings.expandOnHover = parsed.expandOnHover;
    }
    
    return settings;
  } catch {
    return {};
  }
}

export default async function AdminPage() {
  const [categories, services, cookieStore] = await Promise.all([
    getCategories(),
    getServices(),
    cookies(),
  ]);

  const settingsValue = cookieStore.get(SETTINGS_COOKIE_NAME)?.value;
  const initialSettings = parseSettings(settingsValue);

  return (
    <AdminClient
      categories={categories}
      services={services}
      initialSettings={initialSettings}
    />
  );
}
