export const APPEARANCE_META = {
  default: { label: 'Default' },
  bubblegum: { label: 'Bubblegum' },
  claymorphism: { label: 'Claymorphism' },
  mono: { label: 'Mono' },
  'neo-brutalism': { label: 'Neo Brutalism' },
  perpetuity: { label: 'Perpetuity' },
} as const;

export const RANDOM_APPEARANCE = 'random' as const;

export type Appearance = keyof typeof APPEARANCE_META;
export type AppearanceSetting = Appearance | typeof RANDOM_APPEARANCE;

export const DEFAULT_APPEARANCE: Appearance = 'default';

export const APPEARANCES: Appearance[] = [
  DEFAULT_APPEARANCE,
  ...Object.keys(APPEARANCE_META)
    .filter((key) => key !== DEFAULT_APPEARANCE)
    .sort(),
] as Appearance[];

export const APPEARANCE_OPTIONS: AppearanceSetting[] = [...APPEARANCES, RANDOM_APPEARANCE];

export const APPEARANCE_OPTION_META: Record<AppearanceSetting, { label: string }> = {
  ...APPEARANCE_META,
  [RANDOM_APPEARANCE]: { label: 'Random' },
};

export function getRandomAppearance(): Appearance {
  const index = Math.floor(Math.random() * APPEARANCES.length);
  return APPEARANCES[index] ?? DEFAULT_APPEARANCE;
}
