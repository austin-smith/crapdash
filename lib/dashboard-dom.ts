export const DASHBOARD_SERVICE_ID_ATTRIBUTE = 'data-dashboard-service-id';

export function getDashboardServiceElementId(serviceId: string): string {
  return `dashboard-service-${serviceId}`;
}
