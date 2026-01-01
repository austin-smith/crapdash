'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import { CategoryIcon, isValidIconName, resolveIconName } from '@/components/ui/category-icon';
import { createCategory, updateCategory } from '@/lib/actions';
import type { Category } from '@/lib/types';

interface CategoryFormProps {
  category?: Category;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const iconIsValid = icon ? isValidIconName(icon) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    // Validate icon before submitting
    if (icon && !isValidIconName(icon)) {
      setErrors({ icon: `"${icon}" is not a valid Lucide icon name` });
      setIsSubmitting(false);
      return;
    }

    const data = { name, icon: icon || undefined };
    const result = category
      ? await updateCategory(category.id, data)
      : await createCategory(data);

    if (result.success) {
      toast.success(category ? 'Category updated' : 'Category created');
      setName('');
      setIcon('');
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

      <Field data-invalid={!!errors.icon || iconIsValid === false}>
        <FieldLabel>Icon</FieldLabel>
        <Input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Enter icon name"
          disabled={isSubmitting}
        />
        {icon && iconIsValid && (
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
              <CategoryIcon name={icon} className="h-6 w-6" />
            </div>
            <span className="text-sm text-muted-foreground font-mono">{resolveIconName(icon)}</span>
          </div>
        )}
        {icon && !iconIsValid && (
          <p className="text-sm text-destructive">&ldquo;{icon}&rdquo; is not a valid icon name</p>
        )}
        <FieldDescription>
          <a
            href="https://lucide.dev/icons"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Browse icons at lucide.dev
            <ExternalLink className="h-3 w-3" />
          </a>
        </FieldDescription>
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
