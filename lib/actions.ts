'use server';

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { ZodError } from 'zod';
import { readConfig, writeConfig } from './db';
import { appSettingsSchema, categorySchema, categoryCreateSchema, serviceSchema, serviceCreateSchema, serviceIdSchema } from './validations';
import { deleteAppLogo, deleteServiceIcon, getAppLogoFilename, getIconFilePath, isValidImageExtension } from './file-utils';
import { IMAGE_TYPE_ERROR, MAX_FILE_SIZE, isAllowedImageMime } from './image-constants';
import { ICON_TYPES, type Category, type Service, type ActionResult, type CategoryFormData, type CategoryCreateData, type ServiceFormData, type ServiceCreateData, type IconConfig } from './types';

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

async function writeIconFile(file: File, filename: string, baseNameForCleanup: string): Promise<string> {
  const filePath = getIconFilePath(filename);
  const iconsDir = path.dirname(filePath);
  const tempPath = path.join(iconsDir, `${filename}.tmp-${crypto.randomUUID()}`);

  await fs.mkdir(iconsDir, { recursive: true });

  const existingIcons = await fs.readdir(iconsDir).catch(() => []);
  const oldFiles = existingIcons.filter((f) => path.parse(f).name === baseNameForCleanup && f !== filename);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

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

    const ext = path.extname(file.name).toLowerCase();
    const filename = `${serviceId}${ext}`;
    const iconPath = await writeIconFile(file, filename, serviceId);

    return { success: true, data: iconPath };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, errors: [{ field: 'icon', message: 'Failed to upload file' }] };
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

    const ext = path.extname(file.name).toLowerCase();
    const filename = getAppLogoFilename(ext);
    const baseName = path.parse(filename).name;
    const iconPath = await writeIconFile(file, filename, baseName);

    return { success: true, data: iconPath };
  } catch (error) {
    console.error('Upload app logo error:', error);
    return { success: false, errors: [{ field: 'appLogo', message: 'Failed to upload file' }] };
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
        if (previousAppLogoPath) {
          await deleteAppLogo(previousAppLogoPath);
        }
      } else if (incomingLogo !== undefined) {
        nextConfig.appLogo = incomingLogo;
      }
    }

    await writeConfig(nextConfig);

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

    const newService: Service = validated;

    config.services.push(newService);
    await writeConfig(config);

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
    const updatedService: Service = {
      ...config.services[index],
      ...validated,
    };

    config.services[index] = updatedService;
    await writeConfig(config);

    // If we are moving away from an image icon, remove the old image file after the config persists
    if (
      previousService.icon?.type === ICON_TYPES.IMAGE &&
      validated.icon?.type !== ICON_TYPES.IMAGE
    ) {
      await deleteServiceIcon(id);
    }

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

    config.services = config.services.filter(svc => svc.id !== id);
    await writeConfig(config);

    // Delete icon file if it exists
    await deleteServiceIcon(id);

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

    await writeConfig(config);

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
    await writeConfig(config);

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
