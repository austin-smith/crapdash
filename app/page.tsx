import { cookies } from 'next/headers';
import { getCategories, getActiveServices } from '@/lib/db';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { PREFERENCES_COOKIE_NAME } from '@/lib/types';
import { parsePreferences } from '@/lib/preferences';

export default async function Page() {
  const [categories, services, cookieStore] = await Promise.all([
    getCategories(),
    getActiveServices(),
    cookies(),
  ]);

  const settingsValue = cookieStore.get(PREFERENCES_COOKIE_NAME)?.value;
  const initialSettings = parsePreferences(settingsValue);

  return (
    <DashboardClient
      categories={categories}
      services={services}
      initialSettings={initialSettings}
    />
  );
}
