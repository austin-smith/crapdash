import { promises as fs } from 'fs';
import path from 'path';
import type { Category, Service, DashboardConfig } from './types';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

const DEFAULT_CONFIG: DashboardConfig = {
  categories: [],
  services: [],
};

export async function readConfig(): Promise<DashboardConfig> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist, create default
    await writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
}

export async function writeConfig(config: DashboardConfig): Promise<void> {
  try {
    const dir = path.dirname(CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing config:', error);
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
