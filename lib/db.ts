import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { dashboardConfigImportSchema } from './validations';
import { getConfigLockPath, getConfigPath } from './paths';
import type { Category, Service, DashboardConfig, IconConfig } from './types';

const CONFIG_LOCK_TIMEOUT_MS = 5_000;
const CONFIG_LOCK_RETRY_MS = 50;
const CONFIG_LOCK_STALE_MS = 30_000;

const DEFAULT_CONFIG: DashboardConfig = {
  categories: [],
  services: [],
};
const DEFAULT_CONFIG_RAW = JSON.stringify(DEFAULT_CONFIG, null, 2);

class ConfigReadError extends Error {}
class InvalidConfigError extends Error {}

function getDefaultConfig(): DashboardConfig {
  return {
    categories: [],
    services: [],
  };
}

function getConfigRevision(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

async function ensureConfigDirectory(): Promise<void> {
  await fs.mkdir(path.dirname(getConfigPath()), { recursive: true });
}

async function writeRawConfigAtomic(raw: string): Promise<void> {
  await ensureConfigDirectory();

  const configPath = getConfigPath();
  const tempPath = path.join(path.dirname(configPath), `${path.basename(configPath)}.tmp-${randomUUID()}`);

  try {
    await fs.writeFile(tempPath, raw, 'utf-8');
    await fs.rename(tempPath, configPath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function readRawConfigFile(): Promise<string | null> {
  try {
    return await fs.readFile(getConfigPath(), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    console.error('Error reading raw config:', error);
    throw new ConfigReadError('Failed to read configuration');
  }
}

async function loadExistingRawConfig(): Promise<string> {
  const raw = await readRawConfigFile();
  if (raw !== null) {
    return raw;
  }

  await writeRawConfigAtomic(DEFAULT_CONFIG_RAW);
  return DEFAULT_CONFIG_RAW;
}

async function parseConfig(raw: string): Promise<DashboardConfig> {
  try {
    const parsed = JSON.parse(raw);
    return dashboardConfigImportSchema.parse(parsed);
  } catch (error) {
    console.error('Invalid config file:', error);
    throw new InvalidConfigError('Configuration file is invalid');
  }
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireConfigLock(): Promise<void> {
  await ensureConfigDirectory();

  const deadline = Date.now() + CONFIG_LOCK_TIMEOUT_MS;
  const lockPath = getConfigLockPath();

  while (true) {
    try {
      const handle = await fs.open(lockPath, 'wx');
      await handle.close();
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        console.error('Error acquiring config lock:', error);
        throw new Error('Failed to lock configuration');
      }

      const stats = await fs.stat(lockPath).catch(() => null);
      if (stats && Date.now() - stats.mtimeMs > CONFIG_LOCK_STALE_MS) {
        await fs.unlink(lockPath).catch(() => {});
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error('Configuration is busy');
      }

      await wait(CONFIG_LOCK_RETRY_MS);
    }
  }
}

async function releaseConfigLock(): Promise<void> {
  await fs.unlink(getConfigLockPath()).catch(() => {});
}

async function withConfigLock<T>(callback: () => Promise<T>): Promise<T> {
  await acquireConfigLock();

  try {
    return await callback();
  } finally {
    await releaseConfigLock();
  }
}

export async function readConfig(): Promise<DashboardConfig> {
  const raw = await loadExistingRawConfig();
  return parseConfig(raw);
}

export async function readConfigOrDefault(): Promise<DashboardConfig> {
  try {
    return await readConfig();
  } catch (error) {
    if (error instanceof InvalidConfigError) {
      return getDefaultConfig();
    }

    throw error;
  }
}

export async function writeConfig(config: DashboardConfig): Promise<void> {
  try {
    await withConfigLock(async () => {
      await writeRawConfigAtomic(JSON.stringify(config, null, 2));
    });
  } catch (error) {
    console.error('Error writing config:', error);
    throw new Error('Failed to write configuration');
  }
}

export async function readRawConfig(): Promise<string> {
  return loadExistingRawConfig();
}

export async function writeRawConfigIfRevisionMatches(raw: string, expectedRevision?: string): Promise<boolean> {
  try {
    return await withConfigLock(async () => {
      const currentRaw = await loadExistingRawConfig();

      if (expectedRevision && getConfigRevision(currentRaw) !== expectedRevision) {
        return false;
      }

      await writeRawConfigAtomic(raw);
      return true;
    });
  } catch (error) {
    console.error('Error writing raw config:', error);
    throw new Error('Failed to write configuration');
  }
}

export async function getCategories(): Promise<Category[]> {
  const config = await readConfig();
  return config.categories;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find(cat => cat.id === id) || null;
}

export async function getServices(): Promise<Service[]> {
  const config = await readConfig();
  return config.services;
}

export async function getActiveServices(): Promise<Service[]> {
  const services = await getServices();
  return services.filter(service => service.active);
}

export async function getServicesByCategoryId(categoryId: string): Promise<Service[]> {
  const services = await getServices();
  return services.filter(service => service.categoryId === categoryId);
}

export async function getServiceById(id: string): Promise<Service | null> {
  const services = await getServices();
  return services.find(service => service.id === id) || null;
}

export async function getAppSettings(): Promise<{ appTitle?: string; appLogo?: IconConfig }> {
  const config = await readConfig();
  return { appTitle: config.appTitle, appLogo: config.appLogo };
}
