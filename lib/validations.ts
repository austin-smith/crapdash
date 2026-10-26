import { z } from 'zod';
import {
  CLOCK_HOUR_CYCLES,
  ICON_TYPES,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  WEATHER_UNITS,
  WIDGET_TYPES,
} from './types';
import { resolveLucideIconName } from './lucide-icons';
import { isValidTimeZone } from './widgets';

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
  name: z.string().min(1, 'Name is required').max(SERVICE_NAME_MAX_LENGTH, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(SERVICE_DESCRIPTION_MAX_LENGTH, 'Description must be less than 500 characters'),
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

const timeZoneSchema = z
  .string()
  .trim()
  .min(1, 'Time zone is required')
  .refine(isValidTimeZone, 'Must be a valid IANA time zone, e.g. "America/New_York"');

export const clockWidgetSettingsSchema = z.object({
  type: z.literal(WIDGET_TYPES.CLOCK),
  hourCycle: z.enum([CLOCK_HOUR_CYCLES.H12, CLOCK_HOUR_CYCLES.H24]).optional(),
  timeZone: timeZoneSchema.optional(),
  showSeconds: z.boolean().optional(),
  showDate: z.boolean().optional(),
});

export const weatherLocationSchema = z.object({
  name: z.string().trim().min(1, 'Location name is required').max(100, 'Location name must be less than 100 characters'),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
});

export const weatherWidgetSettingsSchema = z.object({
  type: z.literal(WIDGET_TYPES.WEATHER),
  location: weatherLocationSchema,
  units: z.enum([WEATHER_UNITS.METRIC, WEATHER_UNITS.IMPERIAL]),
});

/** Type-specific widget options as submitted by the admin forms (no id/enabled). */
export const widgetSettingsSchema = z.discriminatedUnion('type', [
  clockWidgetSettingsSchema,
  weatherWidgetSettingsSchema,
]);

const widgetMetaShape = {
  id: slugSchema,
  enabled: z.boolean(),
};

export const widgetSchema = z.discriminatedUnion('type', [
  clockWidgetSettingsSchema.extend(widgetMetaShape),
  weatherWidgetSettingsSchema.extend(widgetMetaShape),
]);

// Imported/hand-edited configs may omit `enabled`; treat it like service `active`.
const widgetImportMetaShape = {
  ...widgetMetaShape,
  enabled: z.boolean().optional().default(true),
};

const widgetImportSchema = z.discriminatedUnion('type', [
  clockWidgetSettingsSchema.extend(widgetImportMetaShape),
  weatherWidgetSettingsSchema.extend(widgetImportMetaShape),
]);

export const weatherLocationSearchSchema = z
  .string()
  .trim()
  .min(2, 'Enter at least 2 characters')
  .max(100, 'Search must be less than 100 characters');

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
    widgets: z.array(widgetImportSchema).optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    const categoryIndexById = new Map<string, number>();
    const serviceIndexById = new Map<string, number>();
    const widgetIndexById = new Map<string, number>();

    for (const [index, widget] of (config.widgets ?? []).entries()) {
      if (widgetIndexById.has(widget.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate widget id "${widget.id}"`,
          path: ['widgets', index, 'id'],
        });
      } else {
        widgetIndexById.set(widget.id, index);
      }
    }

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
export type WidgetSettingsInput = z.input<typeof widgetSettingsSchema>;
export type DashboardConfigImportInput = z.infer<typeof dashboardConfigImportSchema>;
