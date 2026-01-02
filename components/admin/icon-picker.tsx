'use client';

import { useState, useRef, useMemo } from 'react';
import Image from 'next/image';
import { ImageIcon, Shapes, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LucideIconInput } from './lucide-icon-input';
import { IMAGE_ACCEPT, IMAGE_TYPE_ERROR, IMAGE_TYPE_LABEL, MAX_FILE_SIZE, isAllowedImageMime } from '@/lib/image-constants';
import { ICON_TYPES, type IconConfig, type IconType } from '@/lib/types';

interface IconPickerProps {
  value?: IconConfig;
  pendingFile?: File | null;
  onValueChange: (value: IconConfig | undefined) => void;
  onFileSelect: (file: File | null) => void;
  onClear: () => void;
  cacheKey?: number;
}

export function IconPicker({
  value,
  pendingFile,
  onValueChange,
  onFileSelect,
  onClear,
  cacheKey,
}: IconPickerProps) {
  const [iconType, setIconType] = useState<IconType>(value?.type ?? ICON_TYPES.IMAGE);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create preview URL for pending file
  const preview = useMemo(() => {
    if (pendingFile) {
      return URL.createObjectURL(pendingFile);
    }
    return null;
  }, [pendingFile]);

  const handleTypeChange = (newType: string) => {
    if (!newType) return;
    const type = newType as IconType;
    setIconType(type);
    setError(null);
    // Clear the current value when switching types
    onFileSelect(null);
    onClear();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 2MB.');
      return;
    }

    // Validate file type
    if (!isAllowedImageMime(file.type)) {
      setError(IMAGE_TYPE_ERROR);
      return;
    }

    onFileSelect(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearImage = () => {
    setError(null);
    onFileSelect(null);
    onClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLucideIconChange = (iconName: string) => {
    setError(null);
    if (!iconName) {
      onValueChange(undefined);
    } else {
      onValueChange({ type: ICON_TYPES.ICON, value: iconName });
    }
  };

  // For image type, compute the current icon URL
  const iconUrl = value?.type === ICON_TYPES.IMAGE && value.value ? `/api/${value.value}` : null;
  const currentImageIcon = preview || (iconUrl && cacheKey ? `${iconUrl}?v=${cacheKey}` : iconUrl);

  // For Lucide type
  const lucideIconName = value?.type === ICON_TYPES.ICON ? value.value : '';

  return (
    <div className="space-y-4">
      {/* Type Toggle */}
      <ToggleGroup
        type="single"
        value={iconType}
        onValueChange={handleTypeChange}
        variant="outline"
      >
        <ToggleGroupItem value={ICON_TYPES.IMAGE} className="flex-1 gap-2">
          <ImageIcon className="size-4" />
          Image
        </ToggleGroupItem>
        <ToggleGroupItem value={ICON_TYPES.ICON} className="flex-1 gap-2">
          <Shapes className="size-4" />
          Lucide
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Image Upload UI */}
      {iconType === ICON_TYPES.IMAGE && (
        <div className="space-y-3">
          <div className="flex items-start gap-4">
            {/* Icon Preview */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
                {currentImageIcon ? (
                  <Image
                    src={currentImageIcon}
                    alt="Service icon"
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {currentImageIcon ? 'Change Icon' : 'Upload Icon'}
                </Button>

                {currentImageIcon && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearImage}
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {IMAGE_TYPE_LABEL} (max {MAX_FILE_SIZE / 1024 / 1024}MB)
              </p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Lucide Icon Input UI */}
      {iconType === ICON_TYPES.ICON && (
        <LucideIconInput
          value={lucideIconName}
          onChange={handleLucideIconChange}
        />
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
