import type { AnchorHTMLAttributes } from 'react';

type LinkTargetProps = Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'>;

export function getLinkTargetProps(openInNewTab: boolean): LinkTargetProps {
  return openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

export function openLink(url: string, openInNewTab: boolean): void {
  if (openInNewTab) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  window.location.assign(url);
}
