import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WidgetCardProps extends React.ComponentProps<'div'> {
  label: string;
}

/**
 * Shared shell for dashboard widgets so every type sits at the same height in the strip.
 */
export function WidgetCard({ label, className, children, ...props }: WidgetCardProps) {
  return (
    <Card
      size="sm"
      role="group"
      aria-label={label}
      className={cn('min-h-18 min-w-40 grow flex-row items-center gap-3 px-4 sm:grow-0', className)}
      {...props}
    >
      {children}
    </Card>
  );
}
