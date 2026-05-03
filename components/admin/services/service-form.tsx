'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { IconPicker } from '../icon-pickers/icon-picker';
import { CategoryIcon } from '@/components/common/icons/category-icon';
import { resolveLucideIconName } from '@/lib/lucide-icons';
import { cleanupFetchedServiceIcon, createService, fetchServiceIcon, updateService, uploadServiceIcon } from '@/lib/actions';
import { slugify } from '@/lib/utils';
import { ICON_TYPES, type Category, type IconConfig, type Service } from '@/lib/types';

interface ServiceFormProps {
  service?: Service;
  categories: Category[];
  onSuccess?: () => void;
  onCancel?: () => void;
  cacheKey?: number;
}

interface FetchedIconRef {
  serviceId: string;
  iconPath: string;
}

function parseServiceUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function getIconFetchId(serviceId: string, serviceUrl: string): string {
  if (serviceId) return serviceId;

  try {
    const hostname = new URL(serviceUrl).hostname.replace(/^www\./, '');
    return slugify(hostname) || 'service';
  } catch {
    return 'service';
  }
}

export function ServiceForm({ service, categories, onSuccess, onCancel, cacheKey }: ServiceFormProps) {
  const [name, setName] = useState(service?.name || '');
  const [description, setDescription] = useState(service?.description || '');
  const [url, setUrl] = useState(service?.url || '');
  const [categoryId, setCategoryId] = useState(service?.categoryId || '');
  const [icon, setIcon] = useState<IconConfig | undefined>(service?.icon);
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null);
  const [active, setActive] = useState(service?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const [iconVersion, setIconVersion] = useState(0);
  const [iconControl, setIconControl] = useState<'auto' | 'manual'>(service ? 'manual' : 'auto');
  const urlRef = useRef(url);
  const lastAutoFetchKeyRef = useRef<string | null>(null);
  const autoFetchRequestRef = useRef(0);
  const provisionalIconRef = useRef<FetchedIconRef | null>(null);

  // Generate slug from name for new services
  const serviceId = service?.id || slugify(name);
  const iconCacheKey = (cacheKey ?? 0) + iconVersion;

  const getValidServiceUrl = useCallback((): string | null => parseServiceUrl(url), [url]);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  const getLatestValidServiceUrl = useCallback((): string | null => parseServiceUrl(urlRef.current), []);

  const cleanupFetchedIcon = useCallback((iconRef: FetchedIconRef) => {
    const formData = new FormData();
    formData.append('serviceId', iconRef.serviceId);
    formData.append('iconPath', iconRef.iconPath);

    void cleanupFetchedServiceIcon(formData);
  }, []);

  const trackProvisionalIcon = useCallback((iconRef: FetchedIconRef) => {
    const previousIcon = provisionalIconRef.current;

    if (previousIcon && previousIcon.iconPath !== iconRef.iconPath) {
      cleanupFetchedIcon(previousIcon);
    }

    provisionalIconRef.current = iconRef;
  }, [cleanupFetchedIcon]);

  const releaseProvisionalIcon = useCallback((keptIconPath?: string) => {
    const currentIcon = provisionalIconRef.current;
    if (!currentIcon) return;

    provisionalIconRef.current = null;
    if (currentIcon.iconPath !== keptIconPath) {
      cleanupFetchedIcon(currentIcon);
    }
  }, [cleanupFetchedIcon]);

  useEffect(() => () => {
    releaseProvisionalIcon();
  }, [releaseProvisionalIcon]);

  const uploadIcon = async (file: File, id: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('serviceId', id);

    const result = await uploadServiceIcon(formData);
    return result.success ? result.data : null;
  };

  const handleFetchFavicon = useCallback(async ({
    silent = false,
    markManual = true,
    expectedUrl,
  }: {
    silent?: boolean;
    markManual?: boolean;
    expectedUrl?: string;
  } = {}) => {
    if (!url || isSubmitting || isFetchingIcon) return;
    const validUrl = getValidServiceUrl();
    if (!validUrl) return;
    const iconFetchId = getIconFetchId(serviceId, validUrl);

    if (markManual) {
      setIconControl('manual');
    }
    setIsFetchingIcon(true);
    if (!silent) {
      setErrors((current) => {
        const next = { ...current };
        delete next.icon;
        delete next.url;
        return next;
      });
    }

    const formData = new FormData();
    formData.append('serviceId', iconFetchId);
    formData.append('url', validUrl);

    try {
      const result = await fetchServiceIcon(formData);
      if (getLatestValidServiceUrl() !== validUrl || (silent && expectedUrl && validUrl !== expectedUrl)) {
        if (result.success) {
          cleanupFetchedIcon({ serviceId: iconFetchId, iconPath: result.data });
        }
        return;
      }

      if (result.success) {
        trackProvisionalIcon({ serviceId: iconFetchId, iconPath: result.data });
        setPendingIconFile(null);
        setIcon({ type: ICON_TYPES.IMAGE, value: result.data });
        setIconVersion((value) => value + 1);
        if (!silent) {
          toast.success('Favicon fetched');
        }
      } else if (!silent) {
        const errorMap: Record<string, string> = {};
        result.errors.forEach((error) => {
          errorMap[error.field] = error.message;
        });
        setErrors((current) => ({ ...current, ...errorMap }));
        toast.error(result.errors[0]?.message ?? 'Failed to fetch favicon');
      }
    } catch {
      if (!silent) {
        setErrors((current) => ({ ...current, icon: 'Failed to fetch favicon' }));
        toast.error('Failed to fetch favicon');
      }
    } finally {
      setIsFetchingIcon(false);
    }
  }, [
    cleanupFetchedIcon,
    getLatestValidServiceUrl,
    getValidServiceUrl,
    isFetchingIcon,
    isSubmitting,
    serviceId,
    trackProvisionalIcon,
    url,
  ]);

  useEffect(() => {
    if (service || iconControl !== 'auto' || pendingIconFile || isSubmitting) return;

    const validUrl = getValidServiceUrl();
    if (!validUrl) return;

    const iconFetchId = getIconFetchId(serviceId, validUrl);
    const fetchKey = `${iconFetchId}:${validUrl}`;
    if (lastAutoFetchKeyRef.current === fetchKey) return;

    const timeout = window.setTimeout(() => {
      const requestId = autoFetchRequestRef.current + 1;
      autoFetchRequestRef.current = requestId;
      setIsFetchingIcon(true);

      const formData = new FormData();
      formData.append('serviceId', iconFetchId);
      formData.append('url', validUrl);

      void fetchServiceIcon(formData).then((result) => {
        if (
          autoFetchRequestRef.current !== requestId ||
          getLatestValidServiceUrl() !== validUrl
        ) {
          if (result.success) {
            cleanupFetchedIcon({ serviceId: iconFetchId, iconPath: result.data });
          }
          return;
        }

        lastAutoFetchKeyRef.current = fetchKey;

        if (result.success) {
          trackProvisionalIcon({ serviceId: iconFetchId, iconPath: result.data });
          setPendingIconFile(null);
          setIcon({ type: ICON_TYPES.IMAGE, value: result.data });
          setIconVersion((value) => value + 1);
        }
      }).finally(() => {
        if (autoFetchRequestRef.current === requestId) {
          setIsFetchingIcon(false);
        }
      });
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [
    cleanupFetchedIcon,
    service,
    iconControl,
    pendingIconFile,
    isSubmitting,
    serviceId,
    getLatestValidServiceUrl,
    getValidServiceUrl,
    trackProvisionalIcon,
  ]);

  const handleUrlChange = (nextUrl: string) => {
    urlRef.current = nextUrl;
    setUrl(nextUrl);

    if (service || iconControl !== 'auto') return;

    autoFetchRequestRef.current += 1;
    lastAutoFetchKeyRef.current = null;
    if (icon?.type === ICON_TYPES.IMAGE) {
      releaseProvisionalIcon();
      setIcon(undefined);
      setIconVersion((value) => value + 1);
    }
  };

  const handleIconValueChange = (nextIcon: IconConfig | undefined) => {
    autoFetchRequestRef.current += 1;
    releaseProvisionalIcon();
    setIconControl('manual');
    setIcon(nextIcon);
  };

  const handleIconFileSelect = (file: File | null) => {
    if (file) {
      autoFetchRequestRef.current += 1;
      releaseProvisionalIcon();
      setIconControl('manual');
    }
    setPendingIconFile(file);
  };

  const handleIconClear = () => {
    autoFetchRequestRef.current += 1;
    releaseProvisionalIcon();
    setIconControl('manual');
    setIcon(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const id = service?.id || serviceId;
    let finalIcon: IconConfig | undefined = icon;

    // Validate non-image selections first
    if (icon?.type === ICON_TYPES.ICON) {
      const resolvedName = resolveLucideIconName(icon.value);
      if (!resolvedName) {
        setErrors({ icon: `"${icon.value}" is not a valid Lucide icon name` });
        setIsSubmitting(false);
        return;
      }
      finalIcon = { type: ICON_TYPES.ICON, value: resolvedName };
    } else if (icon?.type === ICON_TYPES.EMOJI) {
      finalIcon = icon;
    }

    // Upload any pending image file (selecting the Image tab implies intent to use it)
    if (pendingIconFile) {
      const uploadedPath = await uploadIcon(pendingIconFile, id);
      if (uploadedPath) {
        finalIcon = { type: ICON_TYPES.IMAGE, value: uploadedPath };
      } else {
        setErrors({ icon: 'Failed to upload icon' });
        setIsSubmitting(false);
        return;
      }
    }

    const formData = { name, description, url, categoryId, icon: finalIcon, active };
    const result = service
      ? await updateService(service.id, formData)
      : await createService({ id: serviceId, ...formData, fetchFavicon: iconControl === 'auto' });

    if (result.success) {
      releaseProvisionalIcon(result.data.icon?.type === ICON_TYPES.IMAGE ? result.data.icon.value : undefined);
      toast.success(service ? 'Service updated' : 'Service created');
      setName('');
      setDescription('');
      setUrl('');
      setCategoryId('');
      setIcon(undefined);
      setPendingIconFile(null);
      setIconControl('auto');
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
        {!service && serviceId && (
          <FieldDescription className="font-mono">Slug: {serviceId}</FieldDescription>
        )}
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
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://example.com, http://192.168.1.1:8080"
          type="url"
          disabled={isSubmitting}
          className="font-mono text-xs"
        />
        <FieldDescription>Full URL including https:// or http://</FieldDescription>
        {errors.url && <FieldError>{errors.url}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.categoryId}>
        <FieldLabel>Category *</FieldLabel>
        <Select value={categoryId} onValueChange={setCategoryId} disabled={isSubmitting}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <span className="flex items-center gap-2">
                  <CategoryIcon icon={category.icon} className="size-4" />
                  {category.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && <FieldError>{errors.categoryId}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.icon}>
        <FieldLabel>Icon</FieldLabel>
        <IconPicker
          value={icon}
          allowImage={true}
          pendingFile={pendingIconFile}
          onValueChange={handleIconValueChange}
          onFileSelect={handleIconFileSelect}
          onFetchImageFromUrl={handleFetchFavicon}
          fetchImageDisabled={!getValidServiceUrl() || isSubmitting}
          isFetchingImage={isFetchingIcon}
          onClear={handleIconClear}
          cacheKey={iconCacheKey}
        />
        {errors.icon && <FieldError>{errors.icon}</FieldError>}
      </Field>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="active">Active</Label>
          <p className="text-xs text-muted-foreground">
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
