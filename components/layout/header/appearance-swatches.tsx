import { type Appearance } from '@/lib/appearance-config';
import { cn } from '@/lib/utils';

interface AppearanceSwatchesProps {
  appearance: Appearance;
  isDark?: boolean;
  className?: string;
}

const COLOR_VARS = ['--primary', '--secondary', '--accent'] as const;

export function AppearanceSwatches({ appearance, isDark, className }: AppearanceSwatchesProps) {
  return (
    <div
      className={cn('flex items-center gap-1.5', isDark && 'dark', className)}
      data-appearance={appearance}
    >
      {COLOR_VARS.map((cssVar) => (
        <span
          key={cssVar}
          aria-hidden="true"
          className="size-2.5 rounded-full border border-border/50 shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
          style={{ background: `var(${cssVar})` }}
        />
      ))}
    </div>
  );
}
