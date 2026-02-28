'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/ui/file-dropzone';
import { IMAGE_ACCEPT, IMAGE_TYPE_ERROR, IMAGE_TYPE_LABEL, MAX_FILE_SIZE, isAllowedImageMime } from '@/lib/image-constants';
import { cn } from '@/lib/utils';

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

  // Revoke object URLs to avoid leaking memory when files change or component unmounts
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const selectFile = (file?: File | null) => {
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    if (!isAllowedImageMime(file.type)) {
      setError(IMAGE_TYPE_ERROR);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    onFileSelect(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(e.target.files?.[0]);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
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
      <FileDropzone
        className="min-h-24 rounded-lg border-2 border-dashed border-border bg-muted/20 p-3 transition-colors"
        activeClassName="border-primary/70 bg-muted/30"
        onFileDrop={selectFile}
      >
        {(isDragActive) => (
          <div className="flex items-center gap-4">
            {/* Icon Preview */}
            <div className="flex-shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openFilePicker}
                className={cn(
                  'w-16 h-16 rounded-lg border border-border/70 flex items-center justify-center bg-muted/50 overflow-hidden p-0 hover:bg-muted/70',
                  isDragActive && 'border-primary/70'
                )}
                aria-label={currentIcon ? 'Change icon' : 'Upload icon'}
              >
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
              </Button>
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openFilePicker}
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

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {IMAGE_TYPE_LABEL} (max {MAX_FILE_SIZE / 1024 / 1024}MB)
              </p>
            </div>
          </div>
        )}
      </FileDropzone>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
