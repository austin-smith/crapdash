'use client';

import { useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { IMAGE_ACCEPT, IMAGE_TYPE_ERROR, IMAGE_TYPE_LABEL, MAX_FILE_SIZE, isAllowedImageMime } from '@/lib/image-constants';

interface IconUploadProps {
  value?: string;
  pendingFile?: File | null;
  onFileSelect: (file: File | null) => void;
  onClear: () => void;
  cacheKey?: number;
}

export function IconUpload({ value, pendingFile, onFileSelect, onClear, cacheKey }: IconUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create preview URL for pending file
  const preview = useMemo(() => {
    if (pendingFile) {
      return URL.createObjectURL(pendingFile);
    }
    return null;
  }, [pendingFile]);

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

  const handleClear = () => {
    setError(null);
    onFileSelect(null);
    onClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const iconUrl = value ? `/api/${value}` : null;
  const currentIcon = preview || (iconUrl && cacheKey ? `${iconUrl}?v=${cacheKey}` : iconUrl);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        {/* Icon Preview */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
            {currentIcon ? (
              <Image
                src={currentIcon}
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
              {currentIcon ? 'Change Icon' : 'Upload Icon'}
            </Button>

            {currentIcon && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
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

      {/* Error Message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
