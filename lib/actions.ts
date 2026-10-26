'use server';

import { createHash } from 'crypto';
import path from 'path';
import { ZodError } from 'zod';
import { revalidatePath } from 'next/cache';
import { diffConfigs } from './config-diff';
import { collectConfigImportWarnings } from './config-import';
import { listConfigSnapshots, readConfigSnapshot } from './config-snapshots';
import { readConfig, readRawConfig, writeConfig, writeRawConfigIfRevisionMatches } from './db';
import { fetchProvisionalServiceFavicon, fetchServiceFavicon } from './favicon';
import { fetchServiceMetadata as fetchServiceMetadataForUrl, type ServiceMetadata } from './service-metadata';
import { searchWeatherLocations as searchOpenMeteoLocations } from './weather';
import { getAvailableWidgetId } from './widgets';
import {
  appSettingsSchema,
  categorySchema,
  categoryCreateSchema,
  dashboardConfigImportSchema,
  serviceSchema,
  serviceCreateSchema,
  serviceIdSchema,
  weatherLocationSearchSchema,
  widgetSettingsSchema,
  type WidgetSettingsInput,
} from './validations';
import {
  backupServiceIconFiles,
  copyIconToService,
  deleteIconFile,
  getAvailableIconBaseName,
  getAppLogoFilename,
  isProvisionalIconPath,
  isValidImageExtension,
  promoteProvisionalIcon,
  restoreServiceIconFiles,
  writeIconBuffer,
} from './file-utils';
import { IMAGE_TYPE_ERROR, MAX_FILE_SIZE, isAllowedImageMime } from './image-constants';
import {
  CONFIG_SNAPSHOT_REASONS,
  CONFIG_SNAPSHOT_STATUSES,
  ICON_TYPES,
  type Category,
  type Service,
  type ActionResult,
  type CategoryFormData,
  type CategoryCreateData,
  type ServiceFormData,
  type ServiceCreateData,
  type IconConfig,
  type DashboardConfig,
  type ImportConfigResult,
  type WeatherLocation,
  type Widget,
  type ConfigHistory,
  type ConfigHistoryEntry,
  type ConfigSnapshot,
  type ConfigSnapshotResult,
} from './types';

const MAX_CONFIG_IMPORT_SIZE = 5 * 1024 * 1024;
const MAX_CONFIG_IMPORT_BYTES = MAX_CONFIG_IMPORT_SIZE;

interface ConfigEditorState {
  raw: string;
  revision: string;
}

interface SaveConfigJsonInput {
  raw: string;
  revision?: string;
  force?: boolean;
}

type SaveConfigJsonResult = ImportConfigResult & {
  revision: string;
};

interface RestoreConfigSnapshotInput {
  id: string;
  revision: string;
}

type RestoreConfigSnapshotResult = ImportConfigResult & {
  revision: string;
  /** Whether the replaced config was saved to history, so the restore can be undone. */
  snapshotResult: ConfigSnapshotResult;
};

async function getPromotedServiceIcon(
  icon: IconConfig | undefined,
  serviceId: string,
  protectedIconPaths?: Set<string>,
  reservedIconBasenames?: Set<string>
): Promise<IconConfig | undefined> {
  if (icon?.type !== ICON_TYPES.IMAGE || !isProvisionalIconPath(icon.value)) {
    return icon;
  }

  const iconPath = await promoteProvisionalIcon(icon.value, serviceId, {
    protectedIconPaths,
    reservedIconBasenames,
  });
  return {
    type: ICON_TYPES.IMAGE,
    value: iconPath,
  };
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

function getImageIconPath(icon: IconConfig | undefined): string | undefined {
  return icon?.type === ICON_TYPES.IMAGE ? icon.value : undefined;
}

function getReferencedImageIconPaths(
  config: DashboardConfig,
  options: { excludeServiceId?: string; excludeAppLogo?: boolean } = {}
): Set<string> {
  const refs = new Set<string>();

  if (!options.excludeAppLogo) {
    const appLogoPath = getImageIconPath(config.appLogo);
    if (appLogoPath) {
      refs.add(appLogoPath);
    }
  }

  for (const service of config.services) {
    if (service.id === options.excludeServiceId) continue;

    const iconPath = getImageIconPath(service.icon);
    if (iconPath) {
      refs.add(iconPath);
    }
  }

  return refs;
}

function getIconPathBasename(iconPath: string): string {
  return path.parse(path.basename(iconPath)).name;
}

function getImageIconPathBasenames(iconPaths: Set<string>): Set<string> {
  return new Set(
    [...iconPaths].map((iconPath) => getIconPathBasename(iconPath))
  );
}

function getReferencedImageIconBasenames(
  config: DashboardConfig,
  options: { excludeServiceId?: string; excludeAppLogo?: boolean } = {}
): Set<string> {
  return getImageIconPathBasenames(getReferencedImageIconPaths(config, options));
}

async function deleteImageIconIfUnreferenced(iconPath: string | undefined, config: DashboardConfig): Promise<void> {
  if (!iconPath || getReferencedImageIconPaths(config).has(iconPath)) return;

  await deleteIconFile(iconPath);
}

function isServiceOwnedIconPath(iconPath: string, serviceId: string): boolean {
  const iconBaseName = getIconPathBasename(iconPath);

  return iconBaseName === serviceId || iconBaseName.startsWith(`${serviceId}-`);
}

async function getCreatedServiceIcon(
  icon: IconConfig | undefined,
  serviceId: string,
  reservedIconPaths: Set<string>,
  reservedIconBasenames: Set<string>
): Promise<IconConfig | undefined> {
  if (icon?.type !== ICON_TYPES.IMAGE) {
    return icon;
  }

  if (isProvisionalIconPath(icon.value)) {
    return getPromotedServiceIcon(icon, serviceId, reservedIconPaths, reservedIconBasenames);
  }

  try {
    if (
      !reservedIconPaths.has(icon.value) &&
      !reservedIconBasenames.has(getIconPathBasename(icon.value)) &&
      isServiceOwnedIconPath(icon.value, serviceId)
    ) {
      return icon;
    }

    return {
      type: ICON_TYPES.IMAGE,
      value: await copyIconToService(icon.value, serviceId, { reservedIconBasenames }),
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }

    throw error;
  }
}

function validateImageFile(file: File, fieldName: string): { success: false; errors: { field: string; message: string }[] } | null {
  if (!isAllowedImageMime(file.type)) {
    return { success: false, errors: [{ field: fieldName, message: IMAGE_TYPE_ERROR }] };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { success: false, errors: [{ field: fieldName, message: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` }] };
  }
  if (!isValidImageExtension(file.name)) {
    return { success: false, errors: [{ field: fieldName, message: 'Invalid file extension.' }] };
  }
  return null;
}

async function writeIconFile(
  file: File,
  filename: string,
  baseNameForCleanup: string,
  protectedIconPaths?: Set<string>
): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return writeIconBuffer(buffer, filename, { baseNameForCleanup, protectedIconPaths });
}

function mapValidationIssues(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'general',
    message: issue.message,
  }));
}

function getConfigRevision(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

async function parseAndValidateConfigJson(
  raw: string,
  field: string,
  { enforceSizeLimit = true }: { enforceSizeLimit?: boolean } = {}
): Promise<ActionResult<ImportConfigResult>> {
  if (!raw.trim()) {
    return {
      success: false,
      errors: [{ field, message: 'Configuration cannot be empty' }],
    };
  }

  if (enforceSizeLimit && Buffer.byteLength(raw, 'utf-8') > MAX_CONFIG_IMPORT_BYTES) {
    return {
      success: false,
      errors: [{
        field,
        message: `Configuration is too large. Maximum size is ${MAX_CONFIG_IMPORT_BYTES / 1024 / 1024}MB.`,
      }],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : 'Invalid JSON';
    return {
      success: false,
      errors: [{ field, message }],
    };
  }

  const validation = dashboardConfigImportSchema.safeParse(parsed);
  if (!validation.success) {
    return {
      success: false,
      errors: mapValidationIssues(validation.error),
    };
  }

  const nextConfig = validation.data;
  const warnings = await collectConfigImportWarnings(nextConfig);

  return {
    success: true,
    data: {
      warnings,
      config: nextConfig,
    },
  };
}

function parseStoredConfig(raw: string): DashboardConfig | null {
  try {
    const result = dashboardConfigImportSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function persistConfigImportResult(result: ImportConfigResult): Promise<void> {
  await writeConfig(result.config, CONFIG_SNAPSHOT_REASONS.IMPORT);

  revalidatePath('/');
  revalidatePath('/admin');
}

export async function uploadServiceIcon(formData: FormData): Promise<ActionResult<string>> {
  try {
    const file = formData.get('file') as File;
    const serviceId = formData.get('serviceId') as string;

    if (!file) {
      return { success: false, errors: [{ field: 'icon', message: 'No file provided' }] };
    }

    if (!serviceId) {
      return { success: false, errors: [{ field: 'icon', message: 'No service ID provided' }] };
    }

    const idValidation = serviceIdSchema.safeParse(serviceId);
    if (!idValidation.success) {
      return {
        success: false,
        errors: [{ field: 'icon', message: idValidation.error.issues[0]?.message ?? 'Invalid service ID format' }],
      };
    }

    const validationError = validateImageFile(file, 'icon');
    if (validationError) return validationError;

    const config = await readConfig();
    const protectedIconPaths = getReferencedImageIconPaths(config, { excludeServiceId: idValidation.data });
    const ext = path.extname(file.name).toLowerCase();
    const targetBaseName = getAvailableIconBaseName(
      idValidation.data,
      getImageIconPathBasenames(protectedIconPaths)
    );
    const filename = `${targetBaseName}${ext}`;
    const iconPath = await writeIconFile(file, filename, targetBaseName, protectedIconPaths);

    return { success: true, data: iconPath };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, errors: [{ field: 'icon', message: 'Failed to upload file' }] };
  }
}

export async function fetchServiceIcon(formData: FormData): Promise<ActionResult<string>> {
  try {
    const serviceId = formData.get('serviceId') as string;
    const serviceUrl = formData.get('url') as string;

    if (!serviceId) {
      return { success: false, errors: [{ field: 'icon', message: 'No service ID provided' }] };
    }

    const idValidation = serviceIdSchema.safeParse(serviceId);
    if (!idValidation.success) {
      return {
        success: false,
        errors: [{ field: 'icon', message: idValidation.error.issues[0]?.message ?? 'Invalid service ID format' }],
      };
    }

    const urlValidation = serviceSchema.shape.url.safeParse(serviceUrl);
    if (!urlValidation.success) {
      return {
        success: false,
        errors: [{ field: 'url', message: urlValidation.error.issues[0]?.message ?? 'Must be a valid URL' }],
      };
    }

    const iconPath = await fetchProvisionalServiceFavicon(urlValidation.data);
    if (!iconPath) {
      return {
        success: false,
        errors: [{ field: 'icon', message: 'No favicon found for this URL' }],
      };
    }

    return { success: true, data: iconPath };
  } catch (error) {
    console.error('Fetch service icon error:', error);
    return { success: false, errors: [{ field: 'icon', message: 'Failed to fetch favicon' }] };
  }
}

export async function fetchServiceMetadata(formData: FormData): Promise<ActionResult<ServiceMetadata>> {
  try {
    const serviceUrl = formData.get('url') as string;

    const urlValidation = serviceSchema.shape.url.safeParse(serviceUrl);
    if (!urlValidation.success) {
      return {
        success: false,
        errors: [{ field: 'url', message: urlValidation.error.issues[0]?.message ?? 'Must be a valid URL' }],
      };
    }

    const metadata = await fetchServiceMetadataForUrl(urlValidation.data);
    if (!metadata) {
      return {
        success: false,
        errors: [{ field: 'url', message: 'No title or description metadata found for this URL' }],
      };
    }

    return { success: true, data: metadata };
  } catch (error) {
    console.error('Fetch service metadata error:', error);
    return { success: false, errors: [{ field: 'url', message: 'Failed to fetch service details' }] };
  }
}

export async function cleanupFetchedServiceIcon(formData: FormData): Promise<ActionResult<void>> {
  try {
    const iconPath = formData.get('iconPath');

    if (typeof iconPath !== 'string') {
      return { success: false, errors: [{ field: 'icon', message: 'Invalid icon cleanup request' }] };
    }

    if (!isProvisionalIconPath(iconPath)) {
      return { success: false, errors: [{ field: 'icon', message: 'Invalid icon path' }] };
    }

    await deleteIconFile(iconPath);

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Cleanup fetched service icon error:', error);
    return { success: false, errors: [{ field: 'icon', message: 'Failed to clean up favicon' }] };
  }
}

export async function uploadAppLogo(formData: FormData): Promise<ActionResult<string>> {
  try {
    const file = formData.get('file') as File;

    if (!file) {
      return { success: false, errors: [{ field: 'appLogo', message: 'No file provided' }] };
    }

    const validationError = validateImageFile(file, 'appLogo');
    if (validationError) return validationError;

    const config = await readConfig();
    const protectedIconPaths = getReferencedImageIconPaths(config, { excludeAppLogo: true });
    const ext = path.extname(file.name).toLowerCase();
    const filename = getAppLogoFilename(ext);
    const targetBaseName = getAvailableIconBaseName(
      path.parse(filename).name,
      getImageIconPathBasenames(protectedIconPaths)
    );
    const iconPath = await writeIconFile(file, `${targetBaseName}${ext}`, targetBaseName, protectedIconPaths);

    return { success: true, data: iconPath };
  } catch (error) {
    console.error('Upload app logo error:', error);
    return { success: false, errors: [{ field: 'appLogo', message: 'Failed to upload file' }] };
  }
}

export async function importConfig(formData: FormData): Promise<ActionResult<ImportConfigResult>> {
  try {
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return {
        success: false,
        errors: [{ field: 'file', message: 'No file provided' }],
      };
    }

    if (file.size === 0) {
      return {
        success: false,
        errors: [{ field: 'file', message: 'File is empty' }],
      };
    }

    if (file.size > MAX_CONFIG_IMPORT_SIZE) {
      return {
        success: false,
        errors: [{
          field: 'file',
          message: `File too large. Maximum size is ${MAX_CONFIG_IMPORT_SIZE / 1024 / 1024}MB.`,
        }],
      };
    }

    const filename = file.name.toLowerCase();
    if (!filename.endsWith('.json')) {
      return {
        success: false,
        errors: [{ field: 'file', message: 'Config import requires a .json file' }],
      };
    }

    const raw = await file.text();
    if (!raw.trim()) {
      return {
        success: false,
        errors: [{ field: 'file', message: 'File is empty' }],
      };
    }

    const result = await parseAndValidateConfigJson(raw, 'file');
    if (!result.success) return result;

    await persistConfigImportResult(result.data);

    return result;
  } catch (error) {
    console.error('Import config error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to import configuration' }],
    };
  }
}

export async function getConfigEditorState(): Promise<ActionResult<ConfigEditorState>> {
  try {
    const raw = await readRawConfig();

    return {
      success: true,
      data: {
        raw,
        revision: getConfigRevision(raw),
      },
    };
  } catch (error) {
    console.error('Read config editor state error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to read configuration' }],
    };
  }
}

export async function saveConfigJson(input: SaveConfigJsonInput): Promise<ActionResult<SaveConfigJsonResult>> {
  try {
    const raw = typeof input.raw === 'string' ? input.raw : '';
    const result = await parseAndValidateConfigJson(raw, 'config');
    if (!result.success) return result;

    const nextRaw = JSON.stringify(result.data.config, null, 2);

    if (input.force || !input.revision) {
      await writeConfig(result.data.config, CONFIG_SNAPSHOT_REASONS.EDITOR);
    } else {
      const wrote = await writeRawConfigIfRevisionMatches(nextRaw, input.revision, CONFIG_SNAPSHOT_REASONS.EDITOR);

      if (!wrote) {
        return {
          success: false,
          errors: [{
            field: 'revision',
            message: 'Configuration changed since this editor was opened. Reload before saving or force save to replace it.',
          }],
        };
      }
    }

    revalidatePath('/');
    revalidatePath('/admin');

    return {
      success: true,
      data: {
        ...result.data,
        revision: getConfigRevision(nextRaw),
      },
    };
  } catch (error) {
    console.error('Save config JSON error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to save configuration' }],
    };
  }
}

export async function getConfigHistory(): Promise<ActionResult<ConfigHistory>> {
  try {
    const [raw, snapshots] = await Promise.all([readRawConfig(), listConfigSnapshots()]);
    const currentConfig = parseStoredConfig(raw);

    const entries = await Promise.all(
      snapshots.map(async (info): Promise<ConfigHistoryEntry | null> => {
        let snapshot: ConfigSnapshot | null;
        try {
          snapshot = await readConfigSnapshot(info.id);
        } catch (error) {
          // Keep the rest of the history usable when one snapshot can't be read.
          console.error(`Read config snapshot "${info.id}" error:`, error);
          return { ...info, status: CONFIG_SNAPSHOT_STATUSES.UNREADABLE, summary: null };
        }

        // Pruned between listing and reading
        if (!snapshot) return null;

        const snapshotConfig = parseStoredConfig(snapshot.raw);

        return {
          ...info,
          status: snapshotConfig ? CONFIG_SNAPSHOT_STATUSES.VALID : CONFIG_SNAPSHOT_STATUSES.INVALID,
          summary: currentConfig && snapshotConfig ? diffConfigs(currentConfig, snapshotConfig) : null,
        };
      })
    );

    return {
      success: true,
      data: {
        revision: getConfigRevision(raw),
        snapshots: entries.filter((entry): entry is ConfigHistoryEntry => entry !== null),
      },
    };
  } catch (error) {
    console.error('Read config history error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to read configuration history' }],
    };
  }
}

export async function getConfigSnapshot(id: string): Promise<ActionResult<ConfigSnapshot>> {
  try {
    const snapshot = typeof id === 'string' ? await readConfigSnapshot(id) : null;
    if (!snapshot) {
      return { success: false, errors: [{ field: 'id', message: 'Snapshot not found' }] };
    }

    return { success: true, data: snapshot };
  } catch (error) {
    console.error('Read config snapshot error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to read snapshot' }],
    };
  }
}

export async function restoreConfigSnapshot(
  input: RestoreConfigSnapshotInput
): Promise<ActionResult<RestoreConfigSnapshotResult>> {
  try {
    if (typeof input.revision !== 'string' || !input.revision) {
      return {
        success: false,
        errors: [{ field: 'revision', message: 'Missing configuration revision. Reload history and try again.' }],
      };
    }

    const snapshot = typeof input.id === 'string' ? await readConfigSnapshot(input.id) : null;
    if (!snapshot) {
      return { success: false, errors: [{ field: 'id', message: 'Snapshot not found' }] };
    }

    // Snapshots are server-written copies of accepted configs, so the upload size cap doesn't apply.
    const result = await parseAndValidateConfigJson(snapshot.raw, 'snapshot', { enforceSizeLimit: false });
    if (!result.success) return result;

    const nextRaw = JSON.stringify(result.data.config, null, 2);
    const snapshotResult = await writeRawConfigIfRevisionMatches(nextRaw, input.revision, CONFIG_SNAPSHOT_REASONS.RESTORE);

    if (!snapshotResult) {
      return {
        success: false,
        errors: [{
          field: 'revision',
          message: 'Configuration changed since history was opened. Reload history and try again.',
        }],
      };
    }

    revalidatePath('/');
    revalidatePath('/admin');

    return {
      success: true,
      data: {
        ...result.data,
        revision: getConfigRevision(nextRaw),
        snapshotResult,
      },
    };
  } catch (error) {
    console.error('Restore config snapshot error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to restore snapshot' }],
    };
  }
}

type AppSettingsInput = {
  appTitle?: string | null;
  appLogo?: IconConfig | null;
};

export async function updateAppSettings(data: AppSettingsInput): Promise<ActionResult<{ appTitle?: string; appLogo?: IconConfig }>> {
  try {
    const validated = appSettingsSchema.parse(data);
    const config = await readConfig();

    const previousAppLogoPath =
      config.appLogo?.type === ICON_TYPES.IMAGE ? config.appLogo.value : undefined;

    const nextConfig = { ...config };

    if ('appTitle' in validated) {
      const trimmed = validated.appTitle?.trim();
      nextConfig.appTitle = trimmed || undefined;
    }

    const appLogoProvided = Object.hasOwn(data, 'appLogo');
    if (appLogoProvided) {
      const incomingLogo = validated.appLogo;
      if (incomingLogo === null) {
        nextConfig.appLogo = undefined;
      } else if (incomingLogo !== undefined) {
        nextConfig.appLogo = incomingLogo;
      }
    }

    await writeConfig(nextConfig);
    await deleteImageIconIfUnreferenced(previousAppLogoPath, nextConfig);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: { appTitle: nextConfig.appTitle, appLogo: nextConfig.appLogo } };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }
    console.error('Update app settings error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to update app settings' }],
    };
  }
}

export async function createCategory(data: CategoryCreateData): Promise<ActionResult<Category>> {
  try {
    const validated = categoryCreateSchema.parse(data);
    const config = await readConfig();

    // Check for duplicate ID
    const idExists = config.categories.some(c => c.id === validated.id);
    if (idExists) {
      return {
        success: false,
        errors: [{ field: 'name', message: 'A category with this slug already exists' }],
      };
    }

    const newCategory: Category = validated;

    config.categories.push(newCategory);
    await writeConfig(config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: newCategory };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to create category' }],
    };
  }
}

export async function updateCategory(id: string, data: CategoryFormData): Promise<ActionResult<Category>> {
  try {
    const validated = categorySchema.parse(data);
    const config = await readConfig();

    const index = config.categories.findIndex(cat => cat.id === id);
    if (index === -1) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Category not found' }],
      };
    }

    const updatedCategory: Category = {
      ...config.categories[index],
      ...validated,
    };

    config.categories[index] = updatedCategory;
    await writeConfig(config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: updatedCategory };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to update category' }],
    };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult<void>> {
  try {
    const config = await readConfig();

    // Check if category has services
    const servicesInCategory = config.services.filter(s => s.categoryId === id);
    if (servicesInCategory.length > 0) {
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `Cannot delete category with ${servicesInCategory.length} service(s). Delete services first.`
        }],
      };
    }

    config.categories = config.categories.filter(cat => cat.id !== id);
    await writeConfig(config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to delete category' }],
    };
  }
}

export async function createService(data: ServiceCreateData): Promise<ActionResult<Service>> {
  try {
    const shouldFetchFavicon = data.fetchFavicon ?? true;
    const validated = serviceCreateSchema.parse({ ...data, active: data.active ?? true });
    const config = await readConfig();

    // Validate category exists
    const categoryExists = config.categories.some(cat => cat.id === validated.categoryId);
    if (!categoryExists) {
      return {
        success: false,
        errors: [{ field: 'categoryId', message: 'Selected category does not exist' }],
      };
    }

    // Check for duplicate ID
    const idExists = config.services.some(s => s.id === data.id);
    if (idExists) {
      return {
        success: false,
        errors: [{ field: 'name', message: 'A service with this slug already exists' }],
      };
    }

    let downloadedIconPath: string | null = null;
    let promotedIconPath: string | null = null;
    const reservedIconPaths = getReferencedImageIconPaths(config);
    const reservedIconBasenames = getReferencedImageIconBasenames(config);
    const newService: Service = {
      ...validated,
      icon: await getCreatedServiceIcon(validated.icon, validated.id, reservedIconPaths, reservedIconBasenames),
    };
    if (
      newService.icon?.type === ICON_TYPES.IMAGE &&
      validated.icon?.type === ICON_TYPES.IMAGE &&
      newService.icon.value !== validated.icon.value
    ) {
      promotedIconPath = newService.icon.value;
    }

    if (!newService.icon && shouldFetchFavicon) {
      downloadedIconPath = await fetchServiceFavicon(newService.url, newService.id, {
        protectedIconPaths: reservedIconPaths,
        reservedIconBasenames,
      });
      if (downloadedIconPath) {
        newService.icon = { type: ICON_TYPES.IMAGE, value: downloadedIconPath };
      }
    }

    config.services.push(newService);
    try {
      await writeConfig(config);
    } catch (error) {
      if (downloadedIconPath || promotedIconPath) {
        const configWithoutNewService = {
          ...config,
          services: config.services.filter((service) => service.id !== newService.id),
        };
        await deleteImageIconIfUnreferenced(getImageIconPath(newService.icon), configWithoutNewService);
      }
      throw error;
    }

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: newService };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to create service' }],
    };
  }
}

export async function updateService(id: string, data: ServiceFormData): Promise<ActionResult<Service>> {
  try {
    const idValidation = serviceIdSchema.safeParse(id);
    if (!idValidation.success) {
      return {
        success: false,
        errors: [{ field: 'name', message: idValidation.error.issues[0]?.message ?? 'Invalid service ID format' }],
      };
    }

    const validated = serviceSchema.parse(data);
    const config = await readConfig();

    const index = config.services.findIndex(svc => svc.id === id);
    if (index === -1) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Service not found' }],
      };
    }

    // Validate category exists
    const categoryExists = config.categories.some(cat => cat.id === validated.categoryId);
    if (!categoryExists) {
      return {
        success: false,
        errors: [{ field: 'categoryId', message: 'Selected category does not exist' }],
      };
    }

    const previousService = config.services[index];
    const existingIconBackup =
      validated.icon?.type === ICON_TYPES.IMAGE && isProvisionalIconPath(validated.icon.value)
        ? await backupServiceIconFiles(idValidation.data)
        : null;
    const protectedIconPaths = getReferencedImageIconPaths(config, { excludeServiceId: idValidation.data });
    const nextIcon = await getPromotedServiceIcon(
      validated.icon,
      idValidation.data,
      protectedIconPaths,
      getImageIconPathBasenames(protectedIconPaths)
    );
    const promotedIconPath =
      existingIconBackup &&
      nextIcon?.type === ICON_TYPES.IMAGE &&
      validated.icon?.type === ICON_TYPES.IMAGE &&
      nextIcon.value !== validated.icon.value
        ? nextIcon.value
        : undefined;
    const updatedService: Service = {
      ...config.services[index],
      ...validated,
      icon: nextIcon,
    };

    config.services[index] = updatedService;
    try {
      await writeConfig(config);
    } catch (error) {
      if (existingIconBackup) {
        if (promotedIconPath) {
          await deleteIconFile(promotedIconPath);
        }
        await restoreServiceIconFiles(idValidation.data, existingIconBackup);
      }
      throw error;
    }

    await deleteImageIconIfUnreferenced(getImageIconPath(previousService.icon), config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: updatedService };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to update service' }],
    };
  }
}

export async function deleteService(id: string): Promise<ActionResult<void>> {
  try {
    const config = await readConfig();
    const serviceToDelete = config.services.find(svc => svc.id === id);

    config.services = config.services.filter(svc => svc.id !== id);
    await writeConfig(config);

    await deleteImageIconIfUnreferenced(getImageIconPath(serviceToDelete?.icon), config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to delete service' }],
    };
  }
}

export async function toggleServiceActive(id: string): Promise<ActionResult<Service>> {
  try {
    const config = await readConfig();

    const index = config.services.findIndex(svc => svc.id === id);
    if (index === -1) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Service not found' }],
      };
    }

    const updatedService: Service = {
      ...config.services[index],
      active: !config.services[index].active,
    };

    config.services[index] = updatedService;
    await writeConfig(config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: updatedService };
  } catch {
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to toggle service status' }],
    };
  }
}

export async function reorderCategories(orderedIds: string[]): Promise<ActionResult<void>> {
  try {
    const config = await readConfig();

    // Validate all IDs exist
    const existingIds = new Set(config.categories.map(c => c.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        return {
          success: false,
          errors: [{ field: 'general', message: `Category with id "${id}" not found` }],
        };
      }
    }

    // Create a map for quick lookup
    const categoryMap = new Map(config.categories.map(c => [c.id, c]));

    // Rebuild categories array in new order
    config.categories = orderedIds.map(id => categoryMap.get(id)!);

    await writeConfig(config, CONFIG_SNAPSHOT_REASONS.REORDER);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to reorder categories' }],
    };
  }
}

export async function reorderServices(categoryId: string, orderedIds: string[]): Promise<ActionResult<void>> {
  try {
    const config = await readConfig();

    // Get services in this category
    const servicesInCategory = config.services.filter(s => s.categoryId === categoryId);
    const serviceMap = new Map(servicesInCategory.map(s => [s.id, s]));
    const reorderedCategoryServices = orderedIds.map(id => serviceMap.get(id)!);
    
    // Rebuild full services array, replacing this category's services in new order
    const newServices: Service[] = [];
    let inserted = false;
    
    for (const service of config.services) {
      if (service.categoryId === categoryId) {
        if (!inserted) {
          newServices.push(...reorderedCategoryServices);
          inserted = true;
        }
      } else {
        newServices.push(service);
      }
    }

    config.services = newServices;
    await writeConfig(config, CONFIG_SNAPSHOT_REASONS.REORDER);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: undefined };
  } catch {
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to reorder services' }],
    };
  }
}

export async function createWidget(data: WidgetSettingsInput): Promise<ActionResult<Widget>> {
  try {
    const settings = widgetSettingsSchema.parse(data);
    const config = await readConfig();
    const widgets = config.widgets ?? [];

    const widget: Widget = {
      ...settings,
      id: getAvailableWidgetId(settings.type, widgets),
      enabled: true,
    };

    config.widgets = [...widgets, widget];
    await writeConfig(config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: widget };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: mapValidationIssues(error) };
    }
    console.error('Create widget error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to create widget' }],
    };
  }
}

export async function updateWidget(id: string, data: WidgetSettingsInput): Promise<ActionResult<Widget>> {
  try {
    const settings = widgetSettingsSchema.parse(data);
    const config = await readConfig();
    const widgets = config.widgets ?? [];

    const index = widgets.findIndex((widget) => widget.id === id);
    if (index === -1) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Widget not found' }],
      };
    }

    const existing = widgets[index];
    if (existing.type !== settings.type) {
      return {
        success: false,
        errors: [{ field: 'type', message: 'Widget type cannot be changed' }],
      };
    }

    // Replace (not merge) settings so cleared optional fields are removed from the config.
    const updated: Widget = { ...settings, id: existing.id, enabled: existing.enabled };
    config.widgets = widgets.map((widget, widgetIndex) => (widgetIndex === index ? updated : widget));
    await writeConfig(config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, errors: mapValidationIssues(error) };
    }
    console.error('Update widget error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to update widget' }],
    };
  }
}

export async function deleteWidget(id: string): Promise<ActionResult<void>> {
  try {
    const config = await readConfig();
    const widgets = config.widgets ?? [];

    if (!widgets.some((widget) => widget.id === id)) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Widget not found' }],
      };
    }

    config.widgets = widgets.filter((widget) => widget.id !== id);
    await writeConfig(config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Delete widget error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to delete widget' }],
    };
  }
}

export async function setWidgetEnabled(id: string, enabled: boolean): Promise<ActionResult<Widget>> {
  try {
    const config = await readConfig();
    const widgets = config.widgets ?? [];

    const existing = widgets.find((widget) => widget.id === id);
    if (!existing) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Widget not found' }],
      };
    }

    const updated: Widget = { ...existing, enabled: enabled === true };
    config.widgets = widgets.map((widget) => (widget.id === id ? updated : widget));
    await writeConfig(config);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: updated };
  } catch (error) {
    console.error('Set widget enabled error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to update widget' }],
    };
  }
}

export async function reorderWidgets(orderedIds: string[]): Promise<ActionResult<void>> {
  try {
    const config = await readConfig();
    const widgets = config.widgets ?? [];
    const widgetMap = new Map(widgets.map((widget) => [widget.id, widget]));

    const isPermutation =
      Array.isArray(orderedIds) &&
      orderedIds.length === widgets.length &&
      new Set(orderedIds).size === orderedIds.length &&
      orderedIds.every((id) => widgetMap.has(id));

    if (!isPermutation) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Widget order must include every widget exactly once' }],
      };
    }

    config.widgets = orderedIds.map((id) => widgetMap.get(id)!);
    await writeConfig(config, CONFIG_SNAPSHOT_REASONS.REORDER);

    revalidatePath('/');
    revalidatePath('/admin');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Reorder widgets error:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to reorder widgets' }],
    };
  }
}

export async function searchWeatherLocations(query: string): Promise<ActionResult<WeatherLocation[]>> {
  try {
    const validatedQuery = weatherLocationSearchSchema.parse(query);
    const locations = await searchOpenMeteoLocations(validatedQuery);
    return { success: true, data: locations };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map((issue) => ({ field: 'query', message: issue.message })),
      };
    }
    console.error('Weather location search error:', error);
    return {
      success: false,
      errors: [{ field: 'query', message: 'Location search is unavailable right now. Enter coordinates instead.' }],
    };
  }
}
