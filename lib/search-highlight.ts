export interface HighlightPart {
  text: string;
  highlight: boolean;
}

interface HighlightRange {
  start: number;
  end: number;
}

function overlapsExistingRange(range: HighlightRange, ranges: HighlightRange[]): boolean {
  return ranges.some((existing) => (
    range.start < existing.end && range.end > existing.start
  ));
}

export function getHighlightParts(text: string, tokens: string[]): HighlightPart[] {
  if (!text || tokens.length === 0) {
    return text ? [{ text, highlight: false }] : [];
  }

  const normalizedText = text.toLocaleLowerCase();
  const uniqueTokens = Array.from(new Set(tokens))
    .map((token) => token.toLocaleLowerCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const ranges: HighlightRange[] = [];

  for (const token of uniqueTokens) {
    let start = normalizedText.indexOf(token);

    while (start !== -1) {
      const range = { start, end: start + token.length };

      if (!overlapsExistingRange(range, ranges)) {
        ranges.push(range);
      }

      start = normalizedText.indexOf(token, range.end);
    }
  }

  if (ranges.length === 0) {
    return [{ text, highlight: false }];
  }

  ranges.sort((a, b) => a.start - b.start);

  const parts: HighlightPart[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push({ text: text.slice(cursor, range.start), highlight: false });
    }

    parts.push({ text: text.slice(range.start, range.end), highlight: true });
    cursor = range.end;
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), highlight: false });
  }

  return parts;
}
