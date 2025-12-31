'use client';

import { Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
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
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  cacheKey?: number;
  index?: number;
}

export function ServiceCardContext({ service, onEdit, onDelete, cacheKey, index = 0 }: ServiceCardContextProps) {
  const handleOpenInNewTab = () => {
    window.open(service.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(service.url);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          className="group/context animate-card-in"
          style={{ '--index': index } as React.CSSProperties}
        >
          <ServiceCard service={service} cacheKey={cacheKey} />
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

