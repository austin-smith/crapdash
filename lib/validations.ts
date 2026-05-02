import { z } from 'zod';
import { ICON_TYPES } from './types';
import { resolveLucideIconName } from './lucide-icons';

export const slugSchema = z.string().regex(
  /^[a-z0-9-]+$/i,
  'Slug must use letters, numbers, or dashes'
);

// Alias for backwards compatibility
export const serviceIdSchema = slugSchema;

const baseIconValue = z.string().trim().min(1, 'Icon value is required');

export const imageIconSchema = z.object({
  type: z.literal(ICON_TYPES.IMAGE),
  value: baseIconValue.regex(
    /^icons\/[A-Za-z0-9._-]+$/,
    'Image icon path must be within the icons directory'
  ),
});

const lucideIconSchema = z.object({
  type: z.literal(ICON_TYPES.ICON),
  value: baseIconValue,
}).transform((icon, ctx) => {
  const resolved = resolveLucideIconName(icon.value);
  if (!resolved) {
    ctx.addIssue({
      code: 'custom',
      message: `"${icon.value}" is not a valid Lucide icon name`,
      path: ['value'],
    });
    return z.NEVER;
  }
  return { ...icon, value: resolved };
});

const emojiIconSchema = z.object({
  type: z.literal(ICON_TYPES.EMOJI),
  value: baseIconValue,
});

export const iconConfigSchema = z.discriminatedUnion('type', [
  imageIconSchema,
  lucideIconSchema,
  emojiIconSchema,
]);

// Categories only support Lucide or emoji; block image icons to avoid blank renders
export const categoryIconSchema = z.discriminatedUnion('type', [
  lucideIconSchema,
  emojiIconSchema,
]);

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  icon: categoryIconSchema.optional(),
});

export const categoryCreateSchema = categorySchema.extend({
  id: slugSchema,
});

export const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  url: z.string().url('Must be a valid URL'),
  categoryId: z.string().min(1, 'Category is required'),
  icon: iconConfigSchema.optional(),
  active: z.boolean(),
});

export const serviceCreateSchema = serviceSchema.extend({
  id: serviceIdSchema,
});

export const appSettingsSchema = z.object({
  appTitle: z
    .string()
    .trim()
    .min(1, 'App title is required')
    .max(30, 'App title must be less than 30 characters')
    .nullable()
    .optional(),
  appLogo: imageIconSchema.nullable().optional(),
});

const importAppTitleSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z
    .string()
    .trim()
    .min(1, 'App title is required')
    .max(30, 'App title must be less than 30 characters')
    .optional()
);

const importAppLogoSchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  imageIconSchema.optional()
);

const serviceImportSchema = serviceCreateSchema.extend({
  active: z.boolean().optional().default(true),
});

export const dashboardConfigImportSchema = z
  .object({
    appTitle: importAppTitleSchema,
    appLogo: importAppLogoSchema,
    categories: z.array(categoryCreateSchema),
    services: z.array(serviceImportSchema),
  })
  .strict()
  .superRefine((config, ctx) => {
    const categoryIndexById = new Map<string, number>();
    const serviceIndexById = new Map<string, number>();

    for (const [index, category] of config.categories.entries()) {
      const existingIndex = categoryIndexById.get(category.id);
      if (existingIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate category id "${category.id}"`,
          path: ['categories', index, 'id'],
        });
      } else {
        categoryIndexById.set(category.id, index);
      }
    }

    const categoryIds = new Set(config.categories.map((category) => category.id));

    for (const [index, service] of config.services.entries()) {
      const existingIndex = serviceIndexById.get(service.id);
      if (existingIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate service id "${service.id}"`,
          path: ['services', index, 'id'],
        });
      } else {
        serviceIndexById.set(service.id, index);
      }

      if (!categoryIds.has(service.categoryId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Service references unknown category "${service.categoryId}"`,
          path: ['services', index, 'categoryId'],
        });
      }
    }
  });

export type CategoryInput = z.infer<typeof categorySchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>;
export type DashboardConfigImportInput = z.infer<typeof dashboardConfigImportSchema>;
