'use client';

import { Rows3, Columns3 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AnimateIcon } from '@/components/ui/animate-icon';
import { SlidersHorizontalIcon } from '@/components/ui/sliders-horizontal';
import { THEMES, THEME_META } from '@/components/theme/theme-config';
import { Kbd } from '@/components/ui/kbd';
import { getModifierKey } from '@/lib/platform';
import { LAYOUTS, type DashboardSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SettingsDialogProps {
  settings: DashboardSettings;
  onSettingChange: <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K]
  ) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMac: boolean;
}

export function SettingsDialog({ settings, onSettingChange, open, onOpenChange, isMac }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const modifierKey = getModifierKey(isMac);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimateIcon asChild animateOnHover>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon-lg">
            <SlidersHorizontalIcon size={18} />
          </Button>
        </DialogTrigger>
      </AnimateIcon>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your dashboard experience
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Layout Setting */}
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground">Layout</Label>
            <div className="grid grid-cols-2 gap-2">
              <OptionButton
                icon={Rows3}
                label="Rows"
                selected={settings.layout === LAYOUTS.ROWS}
                onSelect={() => onSettingChange('layout', LAYOUTS.ROWS)}
              />
              <OptionButton
                icon={Columns3}
                label="Columns"
                selected={settings.layout === LAYOUTS.COLUMNS}
                onSelect={() => onSettingChange('layout', LAYOUTS.COLUMNS)}
              />
            </div>
          </div>

          <Separator />

          {/* Theme Setting */}
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground">Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => {
                const { icon, label } = THEME_META[t];
                return (
                  <OptionButton
                    key={t}
                    icon={icon}
                    label={label}
                    selected={theme === t}
                    onSelect={() => setTheme(t)}
                  />
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Expand on Hover Setting */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="expand-on-hover">Expand cards on hover</Label>
              <span className="text-[11px] text-muted-foreground">
                Show full description and URL when hovering
              </span>
            </div>
            <Switch
              id="expand-on-hover"
              checked={settings.expandOnHover}
              onCheckedChange={(checked) => onSettingChange('expandOnHover', checked)}
            />
          </div>

          <Separator />

          {/* Keyboard Shortcuts */}
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground">Keyboard shortcuts</Label>
            <div className="rounded-lg border p-3 flex flex-col gap-2">
              <ShortcutRow keys={[modifierKey, '.']} description="Toggle settings" />
              <ShortcutRow keys={[modifierKey, 'J']} description="Cycle theme" />
              <ShortcutRow keys={[modifierKey, 'K']} description="Focus search" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface OptionButtonProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  selected: boolean;
  onSelect: () => void;
}

function OptionButton({ icon: Icon, label, selected, onSelect }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border text-muted-foreground'
      )}
    >
      <Icon size={20} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

interface ShortcutRowProps {
  keys: string[];
  description: string;
}

function ShortcutRow({ keys, description }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{description}</span>
      <div className="flex items-center gap-0.5">
        {keys.map((key, i) => (
          <Kbd key={i}>{key}</Kbd>
        ))}
      </div>
    </div>
  );
}
