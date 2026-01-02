'use client';
import { useTheme } from 'next-themes';
import { LayoutPreviewOption } from './layout-preview-option';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
            <ToggleGroup
              type="single"
              value={settings.layout}
              onValueChange={(value) => value && onSettingChange('layout', value as typeof settings.layout)}
              className="grid grid-cols-2 gap-2 w-full items-stretch"
              spacing={2}
            >
              <LayoutPreviewOption value={LAYOUTS.ROWS} label="Rows" />
              <LayoutPreviewOption value={LAYOUTS.COLUMNS} label="Columns" />
            </ToggleGroup>
          </div>

          <Separator />

          {/* Theme Setting */}
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground">Theme</Label>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={(value) => value && setTheme(value)}
              className="grid grid-cols-3 gap-2 w-full"
              spacing={2}
            >
              {THEMES.map((t) => {
                const { icon: Icon, label } = THEME_META[t];
                return (
                  <ToggleGroupItem
                    key={t}
                    value={t}
                    variant="outline"
                    className="flex-col h-auto gap-1.5 p-3 data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary"
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{label}</span>
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
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
