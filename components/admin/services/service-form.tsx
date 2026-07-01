'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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
import { cleanupFetchedServiceIcon, createService, fetchServiceIcon, fetchServiceMetadata, updateService, uploadServiceIcon } from '@/lib/actions';
import {
  SERVICE_METADATA_APPLY_MODES,
  getServiceMetadataDraftUpdates,
  type ServiceMetadataApplyMode,
} from '@/lib/service-metadata-apply';
import { cn, slugify } from '@/lib/utils';
import { ICON_TYPES, type Category, type IconConfig, type Service, type ServiceFormData } from '@/lib/types';

interface ServiceFormProps {
  service?: Service;
  initialValues?: ServiceFormData;
  categories: Category[];
  onSuccess?: () => void;
  onCancel?: () => void;
  cacheKey?: number;
}

interface FetchedIconRef {
  serviceId: string;
  iconPath: string;
}

interface FetchedServiceMetadata {
  title?: string;
  description?: string;
}

interface MetadataFetchResult {
  found: boolean;
  applied: boolean;
  stale: boolean;
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

export function ServiceForm({ service, initialValues, categories, onSuccess, onCancel, cacheKey }: ServiceFormProps) {
  const formValues = service ?? initialValues;
  const hasSeededValues = !!formValues;
  const [name, setName] = useState(formValues?.name || '');
  const [description, setDescription] = useState(formValues?.description || '');
  const [url, setUrl] = useState(formValues?.url || '');
  const [categoryId, setCategoryId] = useState(formValues?.categoryId || '');
  const [icon, setIcon] = useState<IconConfig | undefined>(formValues?.icon);
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null);
  const [active, setActive] = useState(formValues?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingIcon, setIsFetchingIcon] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [iconVersion, setIconVersion] = useState(0);
  const [iconControl, setIconControl] = useState<'auto' | 'manual'>(
    service || initialValues?.icon ? 'manual' : 'auto'
  );
  const urlRef = useRef(url);
  const nameRef = useRef(name);
  const descriptionRef = useRef(description);
  const hasUserEditedNameRef = useRef(hasSeededValues);
  const hasUserEditedDescriptionRef = useRef(hasSeededValues);
  const lastAutoFetchKeyRef = useRef<string | null>(null);
  const lastAutoMetadataFetchKeyRef = useRef<string | null>(null);
  const autoFetchRequestRef = useRef(0);
  const metadataFetchRequestRef = useRef(0);
  const autoFetchTimeoutRef = useRef<number | null>(null);
  const metadataFetchTimeoutRef = useRef<number | null>(null);
  const provisionalIconRef = useRef<FetchedIconRef | null>(null);

  // Generate slug from name for new services
  const serviceId = service?.id || slugify(name);
  const iconCacheKey = (cacheKey ?? 0) + iconVersion;

  const getValidServiceUrl = useCallback((): string | null => parseServiceUrl(url), [url]);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  const getLatestValidServiceUrl = useCallback((): string | null => parseServiceUrl(urlRef.current), []);

  const hasFillableMetadataFields = useCallback((): boolean => (
    !hasUserEditedNameRef.current ||
    nameRef.current.trim().length === 0 ||
    !hasUserEditedDescriptionRef.current ||
    descriptionRef.current.trim().length === 0
  ), []);

  const clearAutoIconFetchTimeout = useCallback(() => {
    if (autoFetchTimeoutRef.current === null) return;
    window.clearTimeout(autoFetchTimeoutRef.current);
    autoFetchTimeoutRef.current = null;
  }, []);

  const clearAutoMetadataFetchTimeout = useCallback(() => {
    if (metadataFetchTimeoutRef.current === null) return;
    window.clearTimeout(metadataFetchTimeoutRef.current);
    metadataFetchTimeoutRef.current = null;
  }, []);

  const invalidateAutoIconFetch = useCallback(() => {
    clearAutoIconFetchTimeout();
    autoFetchRequestRef.current += 1;
    setIsFetchingIcon(false);
  }, [clearAutoIconFetchTimeout]);

  const invalidateAutoMetadataFetch = useCallback(() => {
    clearAutoMetadataFetchTimeout();
    metadataFetchRequestRef.current += 1;
    setIsFetchingMetadata(false);
  }, [clearAutoMetadataFetchTimeout]);

  const applyFetchedMetadata = useCallback((
    metadata: FetchedServiceMetadata,
    mode: ServiceMetadataApplyMode
  ): { name: boolean; description: boolean } => {
    const updates = getServiceMetadataDraftUpdates(metadata, {
      name: nameRef.current,
      description: descriptionRef.current,
      hasUserEditedName: hasUserEditedNameRef.current,
      hasUserEditedDescription: hasUserEditedDescriptionRef.current,
    }, mode);

    if (updates.name !== undefined) {
      nameRef.current = updates.name;
      hasUserEditedNameRef.current = mode === SERVICE_METADATA_APPLY_MODES.REPLACE;
      setName(updates.name);
    }

    if (updates.description !== undefined) {
      descriptionRef.current = updates.description;
      hasUserEditedDescriptionRef.current = mode === SERVICE_METADATA_APPLY_MODES.REPLACE;
      setDescription(updates.description);
    }

    const appliedName = updates.name !== undefined;
    const appliedDescription = updates.description !== undefined;

    if (appliedName || appliedDescription) {
      setErrors((current) => {
        const next = { ...current };
        if (appliedName) delete next.name;
        if (appliedDescription) delete next.description;
        return next;
      });
    }

    return { name: appliedName, description: appliedDescription };
  }, []);

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

  const handleFetchServiceMetadata = useCallback(async ({
    silent = false,
    expectedDescription,
    expectedName,
    expectedUrl,
    mode = SERVICE_METADATA_APPLY_MODES.REPLACE,
  }: {
    silent?: boolean;
    expectedDescription?: string;
    expectedName?: string;
    expectedUrl?: string;
    mode?: ServiceMetadataApplyMode;
  } = {}): Promise<MetadataFetchResult> => {
    const emptyResult: MetadataFetchResult = { found: false, applied: false, stale: false };

    if (!url || isSubmitting || isFetchingMetadata) return emptyResult;
    const validUrl = getValidServiceUrl();
    if (!validUrl) return emptyResult;
    invalidateAutoMetadataFetch();

    const requestId = metadataFetchRequestRef.current + 1;
    metadataFetchRequestRef.current = requestId;
    setIsFetchingMetadata(true);

    if (!silent) {
      setErrors((current) => {
        const next = { ...current };
        delete next.url;
        return next;
      });
    }

    const formData = new FormData();
    formData.append('url', validUrl);

    try {
      const result = await fetchServiceMetadata(formData);
      if (
        metadataFetchRequestRef.current !== requestId ||
        getLatestValidServiceUrl() !== validUrl ||
        (silent && expectedUrl && validUrl !== expectedUrl)
      ) {
        return { found: false, applied: false, stale: true };
      }

      if (result.success) {
        const metadataToApply: FetchedServiceMetadata = {
          title:
            expectedName === undefined || nameRef.current === expectedName
              ? result.data.title
              : undefined,
          description:
            expectedDescription === undefined || descriptionRef.current === expectedDescription
              ? result.data.description
              : undefined,
        };
        const applied = applyFetchedMetadata(metadataToApply, mode);

        if (!silent) {
          if (applied.name || applied.description) {
            toast.success('Service details fetched');
          }
        }
        return { found: true, applied: applied.name || applied.description, stale: false };
      } else if (!silent) {
        const errorMap: Record<string, string> = {};
        result.errors.forEach((error) => {
          errorMap[error.field] = error.message;
        });
        setErrors((current) => ({ ...current, ...errorMap }));
        toast.error(result.errors[0]?.message ?? 'Failed to fetch service details');
      }
      return emptyResult;
    } catch {
      if (!silent) {
        setErrors((current) => ({ ...current, url: 'Failed to fetch service details' }));
        toast.error('Failed to fetch service details');
      }
      return emptyResult;
    } finally {
      if (metadataFetchRequestRef.current === requestId) {
        setIsFetchingMetadata(false);
      }
    }
  }, [
    applyFetchedMetadata,
    getLatestValidServiceUrl,
    getValidServiceUrl,
    isFetchingMetadata,
    isSubmitting,
    invalidateAutoMetadataFetch,
    url,
  ]);

  const handleFetchFavicon = useCallback(async ({
    silent = false,
    markManual = true,
    expectedUrl,
  }: {
    silent?: boolean;
    markManual?: boolean;
    expectedUrl?: string;
  } = {}): Promise<boolean> => {
    if (!url || isSubmitting || isFetchingIcon) return false;
    const validUrl = getValidServiceUrl();
    if (!validUrl) return false;
    invalidateAutoIconFetch();
    const iconFetchId = getIconFetchId('', validUrl);

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
        return false;
      }

      if (result.success) {
        trackProvisionalIcon({ serviceId: iconFetchId, iconPath: result.data });
        setPendingIconFile(null);
        setIcon({ type: ICON_TYPES.IMAGE, value: result.data });
        setIconVersion((value) => value + 1);
        if (!silent) {
          toast.success('Favicon fetched');
        }
        return true;
      } else if (!silent) {
        const errorMap: Record<string, string> = {};
        result.errors.forEach((error) => {
          errorMap[error.field] = error.message;
        });
        setErrors((current) => ({ ...current, ...errorMap }));
        toast.error(result.errors[0]?.message ?? 'Failed to fetch favicon');
      }
      return false;
    } catch {
      if (!silent) {
        setErrors((current) => ({ ...current, icon: 'Failed to fetch favicon' }));
        toast.error('Failed to fetch favicon');
      }
      return false;
    } finally {
      setIsFetchingIcon(false);
    }
  }, [
    cleanupFetchedIcon,
    getLatestValidServiceUrl,
    getValidServiceUrl,
    isFetchingIcon,
    isSubmitting,
    invalidateAutoIconFetch,
    trackProvisionalIcon,
    url,
  ]);

  const handleFetchServiceDetails = useCallback(async () => {
    if (!url || isSubmitting || isFetchingMetadata || isFetchingIcon) return;
    const validUrl = getValidServiceUrl();
    if (!validUrl) return;

    setErrors((current) => {
      const next = { ...current };
      delete next.icon;
      delete next.url;
      return next;
    });

    const [metadataResult, faviconApplied] = await Promise.all([
      handleFetchServiceMetadata({
        silent: true,
        expectedDescription: descriptionRef.current,
        expectedName: nameRef.current,
        expectedUrl: validUrl,
        mode: SERVICE_METADATA_APPLY_MODES.REPLACE,
      }),
      handleFetchFavicon({
        silent: true,
        expectedUrl: validUrl,
        markManual: true,
      }),
    ]);

    if (metadataResult.stale || getLatestValidServiceUrl() !== validUrl) return;

    if (metadataResult.applied || faviconApplied) {
      toast.success('Service details fetched');
      return;
    }

    // Metadata existed, but user edits prevented applying any fields.
    if (metadataResult.found) return;

    setErrors((current) => ({
      ...current,
      url: 'No service details found for this URL',
    }));
    toast.error('No service details found for this URL');
  }, [
    getLatestValidServiceUrl,
    getValidServiceUrl,
    handleFetchFavicon,
    handleFetchServiceMetadata,
    isFetchingIcon,
    isFetchingMetadata,
    isSubmitting,
    url,
  ]);

  useEffect(() => {
    if (service || iconControl !== 'auto' || pendingIconFile || isSubmitting) return;

    const validUrl = getValidServiceUrl();
    if (!validUrl) return;

    const iconFetchId = getIconFetchId('', validUrl);
    const fetchKey = `${iconFetchId}:${validUrl}`;
    if (lastAutoFetchKeyRef.current === fetchKey) return;

    const timeout = window.setTimeout(() => {
      if (autoFetchTimeoutRef.current === timeout) {
        autoFetchTimeoutRef.current = null;
      }

      const requestId = autoFetchRequestRef.current + 1;
      autoFetchRequestRef.current = requestId;
      setIsFetchingIcon(true);

      const formData = new FormData();
      formData.append('serviceId', iconFetchId);
      formData.append('url', validUrl);

      void (async () => {
        try {
          const result = await fetchServiceIcon(formData);
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
        } catch {
          // Auto-fetch is best-effort; manual fetch reports errors to the user.
        } finally {
          if (autoFetchRequestRef.current === requestId) {
            setIsFetchingIcon(false);
          }
        }
      })();
    }, 600);
    autoFetchTimeoutRef.current = timeout;

    return () => {
      window.clearTimeout(timeout);
      if (autoFetchTimeoutRef.current === timeout) {
        autoFetchTimeoutRef.current = null;
      }
    };
  }, [
    cleanupFetchedIcon,
    service,
    iconControl,
    pendingIconFile,
    isSubmitting,
    getLatestValidServiceUrl,
    getValidServiceUrl,
    trackProvisionalIcon,
  ]);

  useEffect(() => {
    if (service || isSubmitting) return;

    const validUrl = getValidServiceUrl();
    if (!validUrl) return;
    if (!hasFillableMetadataFields()) return;

    const fetchKey = validUrl;
    if (lastAutoMetadataFetchKeyRef.current === fetchKey) return;

    const timeout = window.setTimeout(() => {
      if (metadataFetchTimeoutRef.current === timeout) {
        metadataFetchTimeoutRef.current = null;
      }

      const requestId = metadataFetchRequestRef.current + 1;
      metadataFetchRequestRef.current = requestId;
      setIsFetchingMetadata(true);

      const formData = new FormData();
      formData.append('url', validUrl);

      void (async () => {
        try {
          const result = await fetchServiceMetadata(formData);
          if (
            metadataFetchRequestRef.current !== requestId ||
            getLatestValidServiceUrl() !== validUrl
          ) {
            return;
          }

          lastAutoMetadataFetchKeyRef.current = fetchKey;

          if (result.success) {
            applyFetchedMetadata(result.data, SERVICE_METADATA_APPLY_MODES.FILL_EMPTY);
          }
        } catch {
          // Auto-fetch is best-effort; manual fetch reports errors to the user.
        } finally {
          if (metadataFetchRequestRef.current === requestId) {
            setIsFetchingMetadata(false);
          }
        }
      })();
    }, 600);
    metadataFetchTimeoutRef.current = timeout;

    return () => {
      window.clearTimeout(timeout);
      if (metadataFetchTimeoutRef.current === timeout) {
        metadataFetchTimeoutRef.current = null;
      }
    };
  }, [
    applyFetchedMetadata,
    hasFillableMetadataFields,
    service,
    isSubmitting,
    getLatestValidServiceUrl,
    getValidServiceUrl,
  ]);

  const handleUrlChange = (nextUrl: string) => {
    urlRef.current = nextUrl;
    setUrl(nextUrl);

    if (!service) {
      invalidateAutoMetadataFetch();
      lastAutoMetadataFetchKeyRef.current = null;

      if (!hasUserEditedNameRef.current) {
        nameRef.current = '';
        setName('');
      }
      if (!hasUserEditedDescriptionRef.current) {
        descriptionRef.current = '';
        setDescription('');
      }
    }

    if (service || iconControl !== 'auto') return;

    invalidateAutoIconFetch();
    lastAutoFetchKeyRef.current = null;
    if (icon?.type === ICON_TYPES.IMAGE) {
      releaseProvisionalIcon();
      setIcon(undefined);
      setIconVersion((value) => value + 1);
    }
  };

  const handleNameChange = (nextName: string) => {
    hasUserEditedNameRef.current = true;
    nameRef.current = nextName;
    setName(nextName);
  };

  const handleDescriptionChange = (nextDescription: string) => {
    hasUserEditedDescriptionRef.current = true;
    descriptionRef.current = nextDescription;
    setDescription(nextDescription);
  };

  const handleIconValueChange = (nextIcon: IconConfig | undefined) => {
    invalidateAutoIconFetch();
    releaseProvisionalIcon();
    setIconControl('manual');
    setIcon(nextIcon);
  };

  const handleIconFileSelect = (file: File | null) => {
    if (file) {
      invalidateAutoIconFetch();
      releaseProvisionalIcon();
      setIconControl('manual');
    }
    setPendingIconFile(file);
  };

  const handleIconClear = () => {
    invalidateAutoIconFetch();
    releaseProvisionalIcon();
    setIconControl('manual');
    setIcon(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    invalidateAutoIconFetch();
    invalidateAutoMetadataFetch();
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
      nameRef.current = '';
      descriptionRef.current = '';
      setName('');
      setDescription('');
      setUrl('');
      setCategoryId('');
      setIcon(undefined);
      setPendingIconFile(null);
      setIconControl('auto');
      hasUserEditedNameRef.current = false;
      hasUserEditedDescriptionRef.current = false;
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
      <Field data-invalid={!!errors.url}>
        <div className="flex items-center justify-between gap-3">
          <FieldLabel>URL *</FieldLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleFetchServiceDetails()}
            disabled={!getValidServiceUrl() || isSubmitting || isFetchingMetadata || isFetchingIcon}
          >
            <RefreshCw data-icon="inline-start" className={cn((isFetchingMetadata || isFetchingIcon) && 'animate-spin')} />
            {isFetchingMetadata || isFetchingIcon ? 'Fetching...' : 'Fetch details'}
          </Button>
        </div>
        <Input
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://example.com, http://192.168.1.1:8080"
          type="url"
          disabled={isSubmitting}
          className="font-mono text-xs"
        />
        {errors.url && <FieldError>{errors.url}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.name}>
        <FieldLabel>Name *</FieldLabel>
        <Input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
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
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Enter service description"
          rows={3}
          disabled={isSubmitting}
        />
        {errors.description && <FieldError>{errors.description}</FieldError>}
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
