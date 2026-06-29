import type { ServiceMetadata } from './service-metadata';

export const SERVICE_METADATA_APPLY_MODES = {
  FILL_EMPTY: 'fill-empty',
  REPLACE: 'replace',
} as const;

export type ServiceMetadataApplyMode =
  typeof SERVICE_METADATA_APPLY_MODES[keyof typeof SERVICE_METADATA_APPLY_MODES];

export interface ServiceMetadataDraftState {
  name: string;
  description: string;
  hasUserEditedName: boolean;
  hasUserEditedDescription: boolean;
}

export interface ServiceMetadataDraftUpdates {
  name?: string;
  description?: string;
}

function shouldApplyField({
  mode,
  currentValue,
  hasUserEdited,
}: {
  mode: ServiceMetadataApplyMode;
  currentValue: string;
  hasUserEdited: boolean;
}): boolean {
  return (
    mode === SERVICE_METADATA_APPLY_MODES.REPLACE ||
    !hasUserEdited ||
    currentValue.trim().length === 0
  );
}

export function getServiceMetadataDraftUpdates(
  metadata: ServiceMetadata,
  draft: ServiceMetadataDraftState,
  mode: ServiceMetadataApplyMode
): ServiceMetadataDraftUpdates {
  const updates: ServiceMetadataDraftUpdates = {};

  if (
    metadata.title &&
    shouldApplyField({
      mode,
      currentValue: draft.name,
      hasUserEdited: draft.hasUserEditedName,
    })
  ) {
    updates.name = metadata.title;
  }

  if (
    metadata.description &&
    shouldApplyField({
      mode,
      currentValue: draft.description,
      hasUserEdited: draft.hasUserEditedDescription,
    })
  ) {
    updates.description = metadata.description;
  }

  return updates;
}
