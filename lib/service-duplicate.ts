import { ICON_TYPES, type Service, type ServiceFormData } from './types';
import { slugify } from './utils';

function getUniqueDuplicateName(sourceName: string, existingServices: Service[]): string {
  const trimmedName = sourceName.trim();
  const baseName = trimmedName || 'Service';
  const existingIds = new Set(existingServices.map((service) => service.id));
  const existingNames = new Set(existingServices.map((service) => service.name.trim().toLowerCase()));

  for (let copyNumber = 1; copyNumber < Number.MAX_SAFE_INTEGER; copyNumber += 1) {
    const suffix = copyNumber === 1 ? 'Copy' : `Copy ${copyNumber}`;
    const candidateName = `${baseName} (${suffix})`;
    const candidateId = slugify(candidateName);

    if (candidateId && !existingIds.has(candidateId) && !existingNames.has(candidateName.toLowerCase())) {
      return candidateName;
    }
  }

  throw new Error('Unable to generate a unique service name');
}

export function createServiceDuplicateDraft(
  service: Service,
  existingServices: Service[]
): ServiceFormData {
  return {
    name: getUniqueDuplicateName(service.name, existingServices),
    description: service.description,
    url: service.url,
    categoryId: service.categoryId,
    icon: service.icon?.type === ICON_TYPES.IMAGE
      ? { type: ICON_TYPES.IMAGE, value: service.icon.value }
      : service.icon,
    active: service.active,
  };
}
