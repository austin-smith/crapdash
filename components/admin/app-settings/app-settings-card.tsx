'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CategoryIcon } from '@/components/common/icons/category-icon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { uploadAppLogo, updateAppSettings } from '@/lib/actions';
import { DEFAULT_APP_TITLE, ICON_TYPES, type IconConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AppSettingsCardProps {
  appTitle?: string;
  appLogo?: IconConfig;
  onChange?: (nextTitle?: string, nextLogo?: IconConfig) => void;
}

export function AppSettingsCard({ appTitle, appLogo, onChange }: AppSettingsCardProps) {
  const [title, setTitle] = useState(appTitle?.trim() || DEFAULT_APP_TITLE);
  const [logo, setLogo] = useState<IconConfig | undefined>(appLogo);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoSaving, setIsLogoSaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [failedLogoValue, setFailedLogoValue] = useState<string | null>(null);
  const [loadedLogoValue, setLoadedLogoValue] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appLogoSrc = appLogo?.type === ICON_TYPES.IMAGE ? appLogo.value : null;

  useEffect(() => {
    setTitle(appTitle?.trim() || DEFAULT_APP_TITLE);
  }, [appTitle]);

  useEffect(() => {
    setLogo(appLogo);
  }, [appLogo]);

  useEffect(() => {
    setFailedLogoValue(null);
    setLoadedLogoValue(null);
    setPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
      return null;
    });
  }, [appLogoSrc]);

  const hasTitleChanges = useMemo(() => {
    const currentTitle = title?.trim() || '';
    const savedTitle = appTitle?.trim() || DEFAULT_APP_TITLE;
    return currentTitle !== savedTitle;
  }, [appTitle, title]);

  const persistLogoChange = async ({
    file,
    remove,
  }: {
    file?: File;
    remove?: boolean;
  }) => {
    if (isLogoSaving || (!file && !remove)) return;
    setIsLogoSaving(true);

    try {
      let nextLogoToPersist: IconConfig | null;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadResult = await uploadAppLogo(formData);
        if (!uploadResult.success) {
          toast.error(uploadResult.errors[0]?.message ?? 'Failed to upload logo');
          return;
        }

        nextLogoToPersist = { type: ICON_TYPES.IMAGE, value: uploadResult.data };
      } else {
        nextLogoToPersist = null;
      }

      const result = await updateAppSettings({ appLogo: nextLogoToPersist });

      if (!result.success) {
        toast.error(result.errors[0]?.message ?? 'Failed to save logo');
        return;
      }

      const nextLogo = result.data.appLogo;
      setLogo(nextLogo);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      toast.success(remove ? 'Logo removed' : 'Logo updated');
      onChange?.(result.data.appTitle, nextLogo ?? undefined);
    } finally {
      setIsLogoSaving(false);
    }
  };

  const handleLogoClick = () => {
    if (isLogoSaving) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLogoSaving) return;
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      void persistLogoChange({ file });
    }
  };

  const handleRemoveClick = () => {
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemove = async () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowRemoveConfirm(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    await persistLogoChange({ remove: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !hasTitleChanges) return;

    setIsSaving(true);

    const titleToPersist = title.trim();
    const result = await updateAppSettings({
      appTitle: titleToPersist.length > 0 && titleToPersist !== DEFAULT_APP_TITLE ? titleToPersist : null,
    });

    if (!result.success) {
      toast.error(result.errors[0]?.message ?? 'Failed to save');
      setIsSaving(false);
      return;
    }

    const nextTitle = result.data.appTitle;

    setTitle(nextTitle?.trim() || DEFAULT_APP_TITLE);

    onChange?.(nextTitle, result.data.appLogo ?? undefined);
    toast.success('Title saved');
    setIsSaving(false);
  };

  const currentLogoValue = logo?.type === ICON_TYPES.IMAGE ? logo.value : null;
  const customLogoSrc = previewUrl || (currentLogoValue ? `/api/${currentLogoValue}` : null);
  const loadFailed = !previewUrl && !!currentLogoValue && failedLogoValue === currentLogoValue;
  const isLoaded = previewUrl || (!!currentLogoValue && loadedLogoValue === currentLogoValue);
  const hasCustomLogo = !!customLogoSrc && !loadFailed;

  return (
    <>
      <Card className="shadow-xs sm:w-fit">
        <CardContent>
          <form onSubmit={handleSubmit} className="flex items-center gap-4">
            <div
              className="relative flex-shrink-0"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div
                className="relative h-14 w-14 rounded-lg overflow-hidden cursor-pointer"
                onClick={handleLogoClick}
              >
                {loadFailed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/50 bg-muted/40 text-muted-foreground/80 shadow-inner">
                        <CategoryIcon icon={{ type: ICON_TYPES.ICON, value: 'ImageOff' }} className="h-6 w-6" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Failed to load logo</TooltipContent>
                  </Tooltip>
                ) : hasCustomLogo ? (
                  <>
                    {!isLoaded && <Skeleton className="absolute inset-0" aria-hidden />}
                    <Image
                      src={customLogoSrc}
                      alt="Logo"
                      fill
                      className={cn("object-cover transition-opacity", !isLoaded && "opacity-0")}
                      unoptimized
                      onError={() => currentLogoValue && setFailedLogoValue(currentLogoValue)}
                      onLoad={() => currentLogoValue && setLoadedLogoValue(currentLogoValue)}
                    />
                  </>
                ) : (
                  <Image
                    src="/compy.png"
                    alt="Logo"
                    fill
                    className="object-cover"
                  />
                )}
                <div className={cn(
                  "absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity",
                  isHovered ? "opacity-100" : "opacity-0"
                )}>
                  <Upload className="h-5 w-5 text-white" />
                </div>
              </div>
              {(hasCustomLogo || loadFailed) && (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={handleRemoveClick}
                  className={cn(
                    "absolute -top-2 -right-2 h-5 w-5 rounded-full transition-opacity",
                    isHovered ? "opacity-100" : "opacity-0"
                  )}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={DEFAULT_APP_TITLE}
              maxLength={100}
              disabled={isSaving || isLogoSaving}
              className="flex-1 sm:flex-none sm:w-48"
            />

            {hasTitleChanges && (
              <Button type="submit" disabled={isSaving || isLogoSaving} className="h-9">
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove logo</AlertDialogTitle>
            <AlertDialogDescription>
                Are you sure you want to remove your custom logo? This will reset to the default logo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
