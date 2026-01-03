import { z } from 'zod';
import { ICON_TYPES } from './types';

export const iconConfigSchema = z.object({
  type: z.enum([ICON_TYPES.IMAGE, ICON_TYPES.ICON, ICON_TYPES.EMOJI]),
  value: z.string().min(1, 'Icon value is required'),
});

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  icon: iconConfigSchema.optional(),
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
