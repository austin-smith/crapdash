'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { IconPicker } from './icon-picker';
import { resolveLucideIconName } from '@/lib/lucide-icons';
import { createCategory, updateCategory } from '@/lib/actions';
import { ICON_TYPES, type Category, type IconConfig } from '@/lib/types';

interface CategoryFormProps {
  category?: Category;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState<IconConfig | undefined>(category?.icon);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Validate and resolve icon before submitting
    let finalIcon: IconConfig | undefined = icon;
    if (icon) {
      if (icon.type === ICON_TYPES.ICON) {
        const resolved = resolveLucideIconName(icon.value);
        if (!resolved) {
          setErrors({ icon: `"${icon.value}" is not a valid Lucide icon name` });
          setIsSubmitting(false);
          return;
        }
        finalIcon = { type: ICON_TYPES.ICON, value: resolved };
      }
      // Emoji type: no validation needed, just pass through
    }

    const data = { name, icon: finalIcon };
    const result = category
      ? await updateCategory(category.id, data)
      : await createCategory(data);

    if (result.success) {
      toast.success(category ? 'Category updated' : 'Category created');
      setName('');
      setIcon(undefined);
      onSuccess?.();
    } else {
      const errorMap: Record<string, string> = {};
      result.errors.forEach((error) => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field data-invalid={!!errors.name}>
        <FieldLabel>Name *</FieldLabel>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter category name"
          disabled={isSubmitting}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.icon}>
        <FieldLabel>Icon</FieldLabel>
        <IconPicker
          value={icon}
          onValueChange={setIcon}
          onClear={() => setIcon(undefined)}
          allowImage={false}
          disabled={isSubmitting}
        />
        {errors.icon && <FieldError>{errors.icon}</FieldError>}
      </Field>

      {errors.general && (
        <div className="text-sm text-destructive">{errors.general}</div>
      )}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
