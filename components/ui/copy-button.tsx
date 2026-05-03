'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { AnimateIcon } from '@/components/ui/animated-icons/animate-icon';
import { CopyIcon } from '@/components/ui/animated-icons/copy';
import { Button } from '@/components/ui/button';

interface CopyButtonProps extends Omit<React.ComponentProps<typeof Button>, 'onClick'> {
  value: string;
  copiedLabel?: string;
  copyLabel?: string;
  errorMessage?: string;
  iconOnly?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  successMessage?: string;
}

function fallbackCopy(value: string) {
  const activeElement = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  const textArea = document.createElement('textarea');

  textArea.value = value;
  textArea.readOnly = true;
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  const copied = document.execCommand('copy');

  document.body.removeChild(textArea);

  if (activeElement) {
    activeElement.focus();
  }

  if (!copied) {
    throw new Error('Fallback copy failed');
  }
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  fallbackCopy(value);
}

const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(function CopyButton(
  {
    value,
    copiedLabel = 'Copied',
    copyLabel = 'Copy',
    errorMessage = 'Failed to copy',
    iconOnly = false,
    successMessage,
    disabled,
    children,
    onClick,
    ...props
  },
  ref
) {
  const [copied, setCopied] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    try {
      await copyToClipboard(value);
      setCopied(true);

      if (successMessage) {
        toast.success(successMessage);
      }

      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      resetTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(errorMessage);
    }
  };

  return (
    <AnimateIcon animateOnHover asChild>
      <Button ref={ref} type="button" onClick={handleCopy} disabled={disabled || !value} {...props}>
        {copied ? (
          <Check aria-hidden="true" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CopyIcon size={14} aria-hidden="true" />
        )}
        {!iconOnly && (children ?? (copied ? copiedLabel : copyLabel))}
      </Button>
    </AnimateIcon>
  );
});

export { CopyButton };
