import { z } from 'zod';
import { ICON_TYPES } from './types';
import { resolveLucideIconName } from './lucide-icons';

const baseIconValue = z.string().trim().min(1, 'Icon value is required');

const imageIconSchema = z.object({
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

export const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  url: z.string().url('Must be a valid URL'),
  categoryId: z.string().min(1, 'Category is required'),
  icon: iconConfigSchema.optional(),
  active: z.boolean(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
