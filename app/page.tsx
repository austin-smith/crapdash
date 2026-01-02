import { cookies } from 'next/headers';
import { getCategories, getActiveServices } from '@/lib/db';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { SETTINGS_COOKIE_NAME } from '@/lib/types';
import { parseSettings } from '@/lib/settings';

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
