import { cn } from '@/lib/utils';

interface CornerRibbonProps {
  children: React.ReactNode;
  className?: string;
}

export function CornerRibbon({ children, className }: CornerRibbonProps) {
  return (
    <div className="absolute top-0 right-0 overflow-hidden w-20 h-20 pointer-events-none z-50">
      <div
        className={cn(
          'absolute top-3 -right-6 w-24 rotate-45 text-center text-[10px] font-semibold uppercase tracking-wide py-0.5 shadow-sm',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
