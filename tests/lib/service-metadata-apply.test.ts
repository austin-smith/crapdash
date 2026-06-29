import { describe, expect, it } from 'vitest';
import {
  SERVICE_METADATA_APPLY_MODES,
  getServiceMetadataDraftUpdates,
} from '@/lib/service-metadata-apply';

describe('service metadata draft updates', () => {
  it('fills empty or unowned fields during automatic metadata fetches', () => {
    expect(getServiceMetadataDraftUpdates(
      { title: 'Fetched Title', description: 'Fetched description' },
      {
        name: 'Typed name',
        description: '',
        hasUserEditedName: true,
        hasUserEditedDescription: true,
      },
      SERVICE_METADATA_APPLY_MODES.FILL_EMPTY
    )).toEqual({ description: 'Fetched description' });

    expect(getServiceMetadataDraftUpdates(
      { title: 'Fetched Title', description: 'Fetched description' },
      {
        name: 'Auto name',
        description: 'Auto description',
        hasUserEditedName: false,
        hasUserEditedDescription: false,
      },
      SERVICE_METADATA_APPLY_MODES.FILL_EMPTY
    )).toEqual({
      name: 'Fetched Title',
      description: 'Fetched description',
    });
  });

  it('overwrites draft fields during manual metadata fetches', () => {
    expect(getServiceMetadataDraftUpdates(
      { title: 'Fetched Title', description: 'Fetched description' },
      {
        name: 'Typed name',
        description: 'Typed description',
        hasUserEditedName: true,
        hasUserEditedDescription: true,
      },
      SERVICE_METADATA_APPLY_MODES.REPLACE
    )).toEqual({
      name: 'Fetched Title',
      description: 'Fetched description',
    });
  });

  it('only updates fields that were actually fetched', () => {
    expect(getServiceMetadataDraftUpdates(
      { title: 'Fetched Title' },
      {
        name: 'Typed name',
        description: 'Typed description',
        hasUserEditedName: true,
        hasUserEditedDescription: true,
      },
      SERVICE_METADATA_APPLY_MODES.REPLACE
    )).toEqual({ name: 'Fetched Title' });
  });
});
