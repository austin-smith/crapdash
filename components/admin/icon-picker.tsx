'use client';

import { useMemo, useState } from 'react';
import { Hexagon, ImageIcon, Smile } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

export function IconPicker(props: IconPickerProps) {
  // Remount the inner picker whenever the external icon type or allowImage toggle changes.
  // This resets local tab state without relying on effects.
  const { value, allowImage = true } = props;
  const key = useMemo(
    () => `${allowImage ? 'img' : 'noimg'}:${value?.type ?? 'none'}`,
    [allowImage, value?.type]
  );
  return <IconPickerInner key={key} {...props} allowImage={allowImage} />;
}

function IconPickerInner({
  value,
  pendingFile,
  onValueChange,
  onFileSelect,
  onClear,
  allowImage = true,
  cacheKey,
  disabled,
}: IconPickerProps) {
  const resolveDefaultTab = (): IconType =>
    !allowImage && value?.type === ICON_TYPES.IMAGE
      ? ICON_TYPES.ICON
      : value?.type ?? (allowImage ? ICON_TYPES.IMAGE : ICON_TYPES.ICON);

  // Track the active tab independently so switching tabs doesn't clear the current value
  const [selectedTab, setSelectedTab] = useState<IconType>(resolveDefaultTab());

  const iconType = selectedTab;

  const handleTypeChange = (newType: string) => {
    if (!newType) return;
    const type = newType as IconType;

    // If moving away from the image tab, discard any pending upload
    if (selectedTab === ICON_TYPES.IMAGE && type !== ICON_TYPES.IMAGE) {
      onFileSelect?.(null);
    }

    setSelectedTab(type);
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
    <Tabs value={iconType} onValueChange={handleTypeChange} className="gap-4">
      <TabsList className="h-9 p-1">
        {allowImage && (
          <TabsTrigger value={ICON_TYPES.IMAGE} disabled={disabled} className="px-3">
            <ImageIcon />
            Image
          </TabsTrigger>
        )}
        <TabsTrigger value={ICON_TYPES.ICON} disabled={disabled} className="px-3">
          <Hexagon />
          Lucide
        </TabsTrigger>
        <TabsTrigger value={ICON_TYPES.EMOJI} disabled={disabled} className="px-3">
          <Smile />
          Emoji
        </TabsTrigger>
      </TabsList>

      {allowImage && onFileSelect && (
        <TabsContent value={ICON_TYPES.IMAGE}>
          <IconUpload
            value={imageValue}
            pendingFile={pendingFile}
            onFileSelect={handleImageFileSelect}
            onClear={onClear}
            cacheKey={cacheKey}
          />
        </TabsContent>
      )}

      <TabsContent value={ICON_TYPES.ICON}>
        <LucideIconPicker
          value={lucideIconName}
          onChange={handleLucideIconChange}
          disabled={disabled}
        />
      </TabsContent>

      <TabsContent value={ICON_TYPES.EMOJI}>
        <EmojiPicker
          value={emojiValue}
          onChange={handleEmojiChange}
          disabled={disabled}
        />
      </TabsContent>
    </Tabs>
  );
}
