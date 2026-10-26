import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { readConfigOrDefault } from '@/lib/db';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { WidgetStrip } from '@/components/widgets/widget-strip';
import { PREFERENCES_COOKIE_NAME } from '@/lib/types';
import { parsePreferences } from '@/lib/preferences';
import { getAppTitle } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const config = await readConfigOrDefault();
  return {
    title: getAppTitle(config.appTitle),
  };
}

export default async function Page() {
  const [config, cookieStore] = await Promise.all([readConfigOrDefault(), cookies()]);

  const activeServices = config.services.filter((service) => service.active);
  const enabledWidgets = (config.widgets ?? []).filter((widget) => widget.enabled);

  const settingsValue = cookieStore.get(PREFERENCES_COOKIE_NAME)?.value;
  const initialSettings = parsePreferences(settingsValue);

  return (
    <DashboardClient
      appTitle={config.appTitle}
      appLogo={config.appLogo}
      categories={config.categories}
      services={activeServices}
      initialSettings={initialSettings}
      widgets={enabledWidgets.length > 0 ? <WidgetStrip widgets={enabledWidgets} /> : null}
    />
  );
}
