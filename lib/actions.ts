'use server';

import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import { readConfig, writeConfig } from './db';
import { categorySchema, serviceSchema } from './validations';
import { deleteServiceIcon } from './file-utils';
import type { Category, Service, ActionResult, CategoryFormData, ServiceFormData } from './types';

export async function createCategory(data: CategoryFormData): Promise<ActionResult<Category>> {
  try {
    const validated = categorySchema.parse(data);
    const config = await readConfig();

    const newCategory: Category = {
      id: crypto.randomUUID(),
      ...validated,
    };

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

export async function createService(data: ServiceFormData): Promise<ActionResult<Service>> {
  try {
    const validated = serviceSchema.parse({ ...data, active: data.active ?? true });
    const config = await readConfig();

    // Validate category exists
    const categoryExists = config.categories.some(cat => cat.id === validated.categoryId);
    if (!categoryExists) {
      return {
        success: false,
        errors: [{ field: 'categoryId', message: 'Selected category does not exist' }],
      };
    }

    const newService: Service = {
      id: crypto.randomUUID(),
      ...validated,
    };

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

    const updatedService: Service = {
      ...config.services[index],
      ...validated,
    };

    config.services[index] = updatedService;
    await writeConfig(config);

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
