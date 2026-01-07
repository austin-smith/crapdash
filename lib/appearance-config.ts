export type Appearance = 'default' | 'mono';

export const APPEARANCES: Appearance[] = ['default', 'mono'];

export const APPEARANCE_META: Record<Appearance, { label: string }> = {
  default: { label: 'Default' },
  mono: { label: 'Mono' },
};

export const DEFAULT_APPEARANCE: Appearance = 'default';
