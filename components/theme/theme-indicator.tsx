"use client"

import { cn } from "@/lib/utils"
import { Theme, THEME_META } from "../../lib/theme-config"

interface ThemeIndicatorProps extends React.ComponentProps<"div"> {
  theme: Theme
  visible: boolean
}

export function ThemeIndicator({
  theme,
  visible,
  className,
  ...props
}: ThemeIndicatorProps) {
  const { icon: Icon, label } = THEME_META[theme]

  if (!visible) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center pointer-events-none",
        className
      )}
      {...props}
    >
      <div className="flex w-48 flex-col items-center gap-4 rounded-lg border bg-popover/95 py-10 shadow-2xl">
        <Icon size={56} className="text-primary dark:drop-shadow-[0_0_12px_currentColor]" />
        <span className="text-xl font-semibold">{label}</span>
      </div>
    </div>
  )
}
