'use client';

import { ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CategoryIcon, isValidIconName, resolveIconName } from '@/components/ui/category-icon';

interface LucideIconInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function LucideIconInput({
  value,
  onChange,
  disabled,
  placeholder = 'Enter icon name',
}: LucideIconInputProps) {
  const isValid = value ? isValidIconName(value) : null;

  return (
    <div className="space-y-3">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />

      {value && isValid && (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
            <CategoryIcon name={value} className="h-6 w-6" />
          </div>
          <span className="text-sm text-muted-foreground font-mono">
            {resolveIconName(value)}
          </span>
        </div>
      )}

      {value && !isValid && (
        <p className="text-sm text-destructive">
          &ldquo;{value}&rdquo; is not a valid icon name
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        <a
          href="https://lucide.dev/icons"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Browse icons at lucide.dev
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}

export { isValidIconName, resolveIconName };
