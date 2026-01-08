import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { readConfig } from '@/lib/db';
import { AdminClient } from '@/components/admin/admin-client';
import { PREFERENCES_COOKIE_NAME } from '@/lib/types';
import { parsePreferences } from '@/lib/preferences';
import { getAppTitle } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const config = await readConfig();
  return {
    title: `${getAppTitle(config.appTitle)} /admin`,
  };
}

export default async function AdminPage() {
  const [config, cookieStore] = await Promise.all([readConfig(), cookies()]);

  const settingsValue = cookieStore.get(PREFERENCES_COOKIE_NAME)?.value;
  const initialSettings = parsePreferences(settingsValue);

  return (
    <AdminClient
      appTitle={config.appTitle}
      appLogo={config.appLogo}
      categories={config.categories}
      services={config.services}
      initialSettings={initialSettings}
    />
  );
}
