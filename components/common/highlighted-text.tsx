import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import { getHighlightParts } from '@/lib/search-highlight';

interface HighlightedTextProps {
  text: string;
  tokens: string[];
  markClassName?: string;
}

export function HighlightedText({ text, tokens, markClassName }: HighlightedTextProps) {
  const parts = getHighlightParts(text, tokens);

  return (
    <>
      {parts.map((part, index) => (
        part.highlight ? (
          <mark
            key={`${part.text}-${index}`}
            className={cn(
              'rounded bg-primary/15 px-0.5 text-foreground ring-1 ring-primary/15 box-decoration-clone',
              markClassName
            )}
          >
            {part.text}
          </mark>
        ) : (
          <Fragment key={`${part.text}-${index}`}>{part.text}</Fragment>
        )
      ))}
    </>
  );
}
