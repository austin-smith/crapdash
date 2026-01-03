'use client';

import { useState } from 'react';
import { ImageIcon, Shapes, Smile } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { IconUpload } from './icon-upload';
import { LucideIconPicker } from './lucide-icon-picker';
import { EmojiPicker } from './emoji-picker';
import { ICON_TYPES, type IconConfig, type IconType } from '@/lib/types';

interface IconPickerProps {
  value?: IconConfig;
  onValueChange: (value: IconConfig | undefined) => void;
  onClear: () => void;
  /** Enable image upload option (default: true) */
  allowImage?: boolean;
  /** Required when allowImage is true */
  pendingFile?: File | null;
  /** Required when allowImage is true */
  onFileSelect?: (file: File | null) => void;
  cacheKey?: number;
  disabled?: boolean;
}

export function IconPicker({
  value,
  pendingFile,
  onValueChange,
  onFileSelect,
  onClear,
  allowImage = true,
  cacheKey,
  disabled,
}: IconPickerProps) {
  // Default tab when no value is set
  const defaultTab = allowImage ? ICON_TYPES.IMAGE : ICON_TYPES.ICON;
  
  // Local state only used as fallback when value is undefined (user switching tabs)
  const [selectedTab, setSelectedTab] = useState<IconType>(defaultTab);
  
  // Derive the active type: value?.type is authoritative, fallback to local selection
  const iconType = value?.type ?? selectedTab;

  const handleTypeChange = (newType: string) => {
    if (!newType) return;
    const type = newType as IconType;
    setSelectedTab(type);
    // Clear the current value when switching types
    onFileSelect?.(null);
    onClear();
  };

  const handleImageFileSelect = (file: File | null) => {
    onFileSelect?.(file);
    // Don't set an intermediate value here, the form tracks pendingIconFile
    // and creates a valid IconConfig with the real path after upload succeeds
  };

  const handleLucideIconChange = (iconName: string) => {
    if (!iconName) {
      onValueChange(undefined);
    } else {
      onValueChange({ type: ICON_TYPES.ICON, value: iconName });
    }
  };

  const handleEmojiChange = (emoji: string) => {
    if (!emoji) {
      onValueChange(undefined);
    } else {
      onValueChange({ type: ICON_TYPES.EMOJI, value: emoji });
    }
  };

  // For image type, extract the value path
  const imageValue = value?.type === ICON_TYPES.IMAGE ? value.value : undefined;

  // For Lucide type
  const lucideIconName = value?.type === ICON_TYPES.ICON ? value.value : '';

  // For Emoji type
  const emojiValue = value?.type === ICON_TYPES.EMOJI ? value.value : '';

  return (
    <div className="space-y-4">
      {/* Type Toggle */}
      <ToggleGroup
        type="single"
        value={iconType}
        onValueChange={handleTypeChange}
        variant="outline"
        disabled={disabled}
      >
        {allowImage && (
          <ToggleGroupItem value={ICON_TYPES.IMAGE} className="flex-1 gap-2">
            <ImageIcon className="size-4" />
            Image
          </ToggleGroupItem>
        )}
        <ToggleGroupItem value={ICON_TYPES.ICON} className="flex-1 gap-2">
          <Shapes className="size-4" />
          Lucide
        </ToggleGroupItem>
        <ToggleGroupItem value={ICON_TYPES.EMOJI} className="flex-1 gap-2">
          <Smile className="size-4" />
          Emoji
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Image Upload */}
      {allowImage && iconType === ICON_TYPES.IMAGE && onFileSelect && (
        <IconUpload
          value={imageValue}
          pendingFile={pendingFile}
          onFileSelect={handleImageFileSelect}
          onClear={onClear}
          cacheKey={cacheKey}
        />
      )}

      {/* Lucide Icon Picker */}
      {iconType === ICON_TYPES.ICON && (
        <LucideIconPicker
          value={lucideIconName}
          onChange={handleLucideIconChange}
          disabled={disabled}
        />
      )}

      {/* Emoji Picker */}
      {iconType === ICON_TYPES.EMOJI && (
        <EmojiPicker
          value={emojiValue}
          onChange={handleEmojiChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}
