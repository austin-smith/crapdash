'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field';
import { IconUpload } from './icon-upload';
import { createService, updateService } from '@/lib/actions';
import type { Category, Service } from '@/lib/types';

interface ServiceFormProps {
  service?: Service;
  categories: Category[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ServiceForm({ service, categories, onSuccess, onCancel }: ServiceFormProps) {
  const [name, setName] = useState(service?.name || '');
  const [description, setDescription] = useState(service?.description || '');
  const [url, setUrl] = useState(service?.url || '');
  const [categoryId, setCategoryId] = useState(service?.categoryId || '');
  const [icon, setIcon] = useState(service?.icon || '');
  const [active, setActive] = useState(service?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const data = { name, description, url, categoryId, icon: icon || undefined, active };
    const result = service
      ? await updateService(service.id, data)
      : await createService(data);

    if (result.success) {
      setName('');
      setDescription('');
      setUrl('');
      setCategoryId('');
      setIcon('');
      setActive(true);
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
          placeholder="Enter service name"
          disabled={isSubmitting}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel>Description *</FieldLabel>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter service description"
          rows={3}
          disabled={isSubmitting}
        />
        {errors.description && <FieldError>{errors.description}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.url}>
        <FieldLabel>URL *</FieldLabel>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com or http://192.168.1.1"
          type="url"
          disabled={isSubmitting}
        />
        <FieldDescription>Full URL including http:// or https://</FieldDescription>
        {errors.url && <FieldError>{errors.url}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.categoryId}>
        <FieldLabel>Category *</FieldLabel>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={isSubmitting}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && <FieldError>{errors.categoryId}</FieldError>}
      </Field>

      <Field>
        <FieldLabel>Icon</FieldLabel>
        <IconUpload
          serviceId={service?.id}
          value={icon}
          onUpload={(iconPath) => setIcon(iconPath)}
          onClear={() => setIcon('')}
        />
        <FieldDescription>Upload a custom icon for this service</FieldDescription>
      </Field>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="active">Active</Label>
          <p className="text-sm text-muted-foreground">
            Inactive services are hidden on the dashboard
          </p>
        </div>
        <Switch
          id="active"
          checked={active}
          onCheckedChange={setActive}
          disabled={isSubmitting}
        />
      </div>

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
          {isSubmitting ? 'Saving...' : service ? 'Update Service' : 'Create Service'}
        </Button>
      </div>
    </form>
  );
}
