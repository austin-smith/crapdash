'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface IconUploadProps {
  serviceId?: string;
  value?: string;
  onUpload: (iconPath: string) => void;
  onClear: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function IconUpload({ serviceId, value, onUpload, onClear }: IconUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 2MB.');
      return;
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only PNG, JPG, SVG, WebP, and GIF are allowed.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    if (!serviceId) {
      setError('Service ID is required for upload.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('serviceId', serviceId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        onUpload(result.iconPath);
        setPreview(null);
      } else {
        setError(result.error || 'Failed to upload file');
        setPreview(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload file');
      setPreview(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    setPreview(null);
    setError(null);
    onClear();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentIcon = preview || value;

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
              disabled={isUploading || !serviceId}
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : currentIcon ? 'Change Icon' : 'Upload Icon'}
            </Button>

            {currentIcon && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
                Remove
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            PNG, JPG, SVG, WebP, or GIF (max 2MB)
          </p>

          {!serviceId && (
            <p className="text-xs text-muted-foreground">
              Save the service first to upload an icon
            </p>
          )}
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
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
