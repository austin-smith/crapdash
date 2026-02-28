'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  className?: string;
  activeClassName?: string;
  disabled?: boolean;
  onFileDrop: (file?: File | null) => void;
  children: React.ReactNode | ((isDragActive: boolean) => React.ReactNode);
}

export function FileDropzone({
  className,
  activeClassName,
  disabled = false,
  onFileDrop,
  children,
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragDepthRef = useRef(0);

  const hasFiles = (types: readonly string[]) => types.includes('Files');

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(e.dataTransfer.types)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(e.dataTransfer.types)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(e.dataTransfer.types)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(dragDepthRef.current - 1, 0);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(e.dataTransfer.types)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    onFileDrop(e.dataTransfer.files?.[0]);
  };

  return (
    <div
      className={cn(className, isDragActive && activeClassName)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {typeof children === 'function' ? children(isDragActive) : children}
    </div>
  );
}
