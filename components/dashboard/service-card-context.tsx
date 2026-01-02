'use client';

import { Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ServiceCard } from './service-card';
import type { Service } from '@/lib/types';

interface ServiceCardContextProps {
  service: Service;
  expandOnHover: boolean;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  cacheKey?: number;
  index?: number;
}

export function ServiceCardContext({ service, expandOnHover, onEdit, onDelete, cacheKey, index = 0 }: ServiceCardContextProps) {
  const handleOpenInNewTab = () => {
    window.open(service.url, '_blank', 'noopener,noreferrer');
  };

  /**
   * Copy URL to clipboard using deprecated execCommand.
   * The modern Clipboard API (navigator.clipboard) only works over HTTPS,
   * but this app may be served over HTTP. execCommand works everywhere.
   */
  const handleCopyUrl = () => {
    setTimeout(() => {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = service.url;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('URL copied to clipboard');
      } catch {
        toast.error('Failed to copy URL to clipboard');
      }
    }, 0);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className="group/context animate-card-in"
          style={{ '--index': index } as React.CSSProperties}
        >
          <ServiceCard service={service} expandOnHover={expandOnHover} cacheKey={cacheKey} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onEdit(service)}>
          <Pencil />
          Edit
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleCopyUrl}>
          <Copy />
          Copy URL
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInNewTab}>
          <ExternalLink />
          Open in New Tab
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={() => onDelete(service)}>
          <Trash2 />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
