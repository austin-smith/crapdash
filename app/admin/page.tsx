import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getCategories, getServices } from '@/lib/db';
import { AdminClient } from '@/components/admin/admin-client';
import { SETTINGS_COOKIE_NAME } from '@/lib/types';
import { parseSettings } from '@/lib/settings';

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
