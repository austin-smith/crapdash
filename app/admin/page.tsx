import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCategories, getServices } from '@/lib/db';
import { AdminClient } from '@/components/admin/admin-client';
import { PREFERENCES_COOKIE_NAME } from '@/lib/types';
import { parsePreferences } from '@/lib/preferences';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'crapdash /admin',
};

export default async function AdminPage() {
  const [categories, services, cookieStore] = await Promise.all([
    getCategories(),
    getServices(),
    cookies(),
  ]);

  const settingsValue = cookieStore.get(PREFERENCES_COOKIE_NAME)?.value;
  const initialSettings = parsePreferences(settingsValue);

  return (
    <AdminClient
      categories={categories}
      services={services}
      initialSettings={initialSettings}
    />
  );
}
