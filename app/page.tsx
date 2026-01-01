import { cookies } from 'next/headers';
import { getCategories, getActiveServices } from '@/lib/db';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { LAYOUTS, LAYOUT_COOKIE_NAME, DEFAULT_LAYOUT, type DashboardLayout } from '@/lib/types';

export default async function Page() {
  const [categories, services, cookieStore] = await Promise.all([
    getCategories(),
    getActiveServices(),
    cookies(),
  ]);

  const layoutValue = cookieStore.get(LAYOUT_COOKIE_NAME)?.value;
  const initialLayout: DashboardLayout = 
    layoutValue === LAYOUTS.ROWS || layoutValue === LAYOUTS.COLUMNS ? layoutValue : DEFAULT_LAYOUT;

  return (
    <DashboardClient
      categories={categories}
      services={services}
      initialLayout={initialLayout}
    />
  );
}
