import { z } from 'zod';
import {
  ICON_TYPES,
  SEARCH_BANG_PREFIX,
  SEARCH_ENGINES,
  SEARCH_QUERY_PLACEHOLDER,
  SERVICE_DESCRIPTION_MAX_LENGTH,
  SERVICE_NAME_MAX_LENGTH,
  type SearchEngine,
} from './types';
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

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

const searchUrlTemplateSchema = z
  .string()
  .trim()
  .refine(isHttpUrl, 'Must be a valid http or https URL')
  .refine(
    (value) => value.includes(SEARCH_QUERY_PLACEHOLDER),
    `Must include ${SEARCH_QUERY_PLACEHOLDER} where the search query goes`
  );

const SEARCH_BANG_TRIGGER_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export const searchBangSchema = z
  .object({
    trigger: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, { message: 'Trigger is required', abort: true })
      .max(20, 'Trigger must be 20 characters or fewer')
      .regex(SEARCH_BANG_TRIGGER_PATTERN, 'Use letters, numbers, dots, dashes, or underscores'),
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(50, 'Name must be 50 characters or fewer'),
    url: searchUrlTemplateSchema,
  })
  .strict();

export const searchBangsSchema = z
  .array(searchBangSchema)
  .max(100, 'Use 100 bangs or fewer')
  .superRefine((bangs, ctx) => {
    const seenTriggers = new Set<string>();

    bangs.forEach((bang, index) => {
      if (seenTriggers.has(bang.trigger)) {
        ctx.addIssue({
          code: 'custom',
          message: `${SEARCH_BANG_PREFIX}${bang.trigger} is already used`,
          path: [index, 'trigger'],
        });
      }
      seenTriggers.add(bang.trigger);
    });
  });

const searchEngineShape = {
  engine: z.enum(SEARCH_ENGINES, { message: 'Choose a search engine' }),
  customUrl: searchUrlTemplateSchema.optional(),
};

function requireCustomSearchUrl(
  settings: { engine: SearchEngine; customUrl?: string },
  ctx: z.RefinementCtx
) {
  if (settings.engine === SEARCH_ENGINES.CUSTOM && !settings.customUrl) {
    ctx.addIssue({
      code: 'custom',
      message: 'Custom search URL is required',
      path: ['customUrl'],
    });
  }
}

export const searchEngineSettingsSchema = z
  .object(searchEngineShape)
  .strict()
  .superRefine(requireCustomSearchUrl);

export const searchSettingsSchema = z
  .object({ ...searchEngineShape, bangs: searchBangsSchema.optional() })
  .strict()
  .superRefine(requireCustomSearchUrl);

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
    search: searchSettingsSchema.optional(),
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
