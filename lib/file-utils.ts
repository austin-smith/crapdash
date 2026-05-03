import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { isAllowedImageExtension } from './image-constants';

const ICONS_DIR = path.join(process.cwd(), 'data', 'icons');
const APP_LOGO_BASENAME = 'app-logo';
const PROVISIONAL_ICON_BASENAME_PREFIX = '__tmp-favicon-';

interface IconFileBackup {
  filename: string;
  buffer: Buffer;
}

async function getIconFilesForBaseName(baseName: string): Promise<string[]> {
  const files = await fs.readdir(ICONS_DIR).catch(() => []);

  return files.filter((file) => path.parse(file).name === baseName);
}

/**
 * Deletes all icon files for a given service ID
 * Checks all possible extensions since we don't know which one was uploaded
 */
export async function deleteServiceIcon(serviceId: string): Promise<void> {
  try {
    const iconFiles = await getIconFilesForBaseName(serviceId);

    // Delete each found icon file
    for (const file of iconFiles) {
      const filePath = path.join(ICONS_DIR, file);
      await fs.unlink(filePath);
      console.log(`Deleted icon: ${file}`);
    }
  } catch (error) {
    console.error(`Error deleting icon for service ${serviceId}:`, error);
    // Don't throw - deletion failures shouldn't block other operations
  }
}

/**
 * Gets the path to a service icon if it exists
 */
export async function getServiceIconPath(serviceId: string): Promise<string | null> {
  try {
    const iconFile = (await getIconFilesForBaseName(serviceId))[0];

    return iconFile ? `icons/${iconFile}` : null;
  } catch (error) {
    console.error(`Error getting icon for service ${serviceId}:`, error);
    return null;
  }
}

/**
 * Validates file extension
 */
export function isValidImageExtension(filename: string): boolean {
  return isAllowedImageExtension(filename);
}

/**
 * Gets the full filesystem path for an icon
 */
export function getIconFilePath(filename: string): string {
  return path.join(ICONS_DIR, filename);
}

/**
 * Writes an icon buffer atomically and removes stale files for the same logical icon name.
 */
export async function writeIconBuffer(
  buffer: Buffer,
  filename: string,
  baseNameForCleanup?: string
): Promise<string> {
  const filePath = getIconFilePath(filename);
  const iconsDir = path.dirname(filePath);
  const tempPath = path.join(iconsDir, `${filename}.tmp-${randomUUID()}`);

  await fs.mkdir(iconsDir, { recursive: true });

  const existingIcons = baseNameForCleanup ? await fs.readdir(iconsDir).catch(() => []) : [];
  const oldFiles = existingIcons.filter((file) => (
    path.parse(file).name === baseNameForCleanup && file !== filename
  ));

  try {
    await fs.writeFile(tempPath, buffer);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }

  for (const oldFile of oldFiles) {
    await fs.unlink(path.join(iconsDir, oldFile)).catch(() => {});
  }

  return `icons/${filename}`;
}

export async function backupServiceIconFiles(serviceId: string): Promise<IconFileBackup[]> {
  const files = await getIconFilesForBaseName(serviceId);

  return Promise.all(files.map(async (filename) => ({
    filename,
    buffer: await fs.readFile(getIconFilePath(filename)),
  })));
}

export async function restoreServiceIconFiles(
  serviceId: string,
  backups: IconFileBackup[]
): Promise<void> {
  await fs.mkdir(ICONS_DIR, { recursive: true });

  const currentFiles = await getIconFilesForBaseName(serviceId);
  await Promise.all(currentFiles.map((filename) => (
    fs.unlink(getIconFilePath(filename)).catch(() => {})
  )));

  await Promise.all(backups.map((backup) => (
    fs.writeFile(getIconFilePath(backup.filename), backup.buffer)
  )));
}

export function getProvisionalIconFilename(ext: string): string {
  return `${PROVISIONAL_ICON_BASENAME_PREFIX}${randomUUID()}${ext}`;
}

export function isProvisionalIconPath(iconPath: string): boolean {
  const filename = path.basename(iconPath);

  return (
    iconPath === `icons/${filename}` &&
    path.parse(filename).name.startsWith(PROVISIONAL_ICON_BASENAME_PREFIX) &&
    isValidImageExtension(filename)
  );
}

export async function promoteProvisionalIcon(iconPath: string, serviceId: string): Promise<string> {
  if (!isProvisionalIconPath(iconPath)) {
    throw new Error('Only provisional icons can be promoted');
  }

  const filename = path.basename(iconPath);
  const ext = path.extname(filename).toLowerCase();
  const buffer = await fs.readFile(getIconFilePath(filename));
  return writeIconBuffer(buffer, `${serviceId}${ext}`, serviceId);
}

/**
 * Deletes a single icon file by stored config path (e.g., "icons/foo.png").
 */
export async function deleteIconFile(iconPath: string): Promise<void> {
  const filePath = path.join(ICONS_DIR, path.basename(iconPath));

  await fs.unlink(filePath).catch(() => {});
}

/**
 * Deletes the stored app logo file at the given config path (e.g., "icons/foo.png").
 */
export async function deleteAppLogo(iconPath: string): Promise<void> {
  const filePath = path.join(ICONS_DIR, path.basename(iconPath));
  try {
    await fs.unlink(filePath).catch(() => {});
  } catch (error) {
    console.error('Error deleting app logo:', error);
  }
}

/**
 * Gets the target filename for the app logo with the provided extension
 */
export function getAppLogoFilename(ext: string): string {
  return `${APP_LOGO_BASENAME}${ext}`;
}
