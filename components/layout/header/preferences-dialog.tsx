'use client';
import { useTheme } from 'next-themes';
import { LayoutPreviewOption } from './layout-preview-option';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { THEMES, THEME_META } from '@/lib/theme-config';
import {
  APPEARANCE_OPTION_META,
  APPEARANCE_OPTIONS,
  RANDOM_APPEARANCE,
  type Appearance,
  type AppearanceSetting,
} from '@/lib/appearance-config';
import { Kbd, ModKbd } from '@/components/ui/kbd';
import { LAYOUTS, type Preferences } from '@/lib/types';
import { AppearanceSwatches } from './appearance-swatches';
import { Shuffle } from 'lucide-react';

interface PreferencesDialogProps {
  settings: Preferences;
  onSettingChange: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreferencesDialog({ settings, onSettingChange, open, onOpenChange }: PreferencesDialogProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [defaultAppearance] = APPEARANCE_OPTIONS;
  const randomAppearance = RANDOM_APPEARANCE;
  const otherAppearanceOptions = APPEARANCE_OPTIONS.filter(
    (appearance) => appearance !== defaultAppearance && appearance !== randomAppearance
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
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

          {/* Appearance Setting */}
          <div className="flex items-center justify-between gap-4">
            <Label className="text-muted-foreground">Appearance</Label>
            <Select
              value={settings.appearance}
              onValueChange={(value) => onSettingChange('appearance', value as AppearanceSetting)}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key={defaultAppearance} value={defaultAppearance}>
                  <div className="flex items-center gap-2">
                    <AppearanceSwatches appearance={defaultAppearance as Appearance} isDark={isDark} />
                    <span>{APPEARANCE_OPTION_META[defaultAppearance].label}</span>
                  </div>
                </SelectItem>
                <SelectSeparator />
                {otherAppearanceOptions.map((appearance) => (
                  <SelectItem key={appearance} value={appearance}>
                    <div className="flex items-center gap-2">
                      <AppearanceSwatches appearance={appearance as Appearance} isDark={isDark} />
                      <span>{APPEARANCE_OPTION_META[appearance].label}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem key={randomAppearance} value={randomAppearance}>
                  <div className="flex items-center gap-2">
                    <Shuffle className="size-3.5 text-muted-foreground" />
                    <span>{APPEARANCE_OPTION_META[randomAppearance].label}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
              <ShortcutRow keys={['mod', '.']} description="Toggle settings" />
              <ShortcutRow keys={['mod', 'J']} description="Cycle theme" />
              <ShortcutRow keys={['mod', 'K']} description="Focus search" />
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
        {keys.map((key, i) =>
          key === 'mod' ? <ModKbd key={i} /> : <Kbd key={i}>{key}</Kbd>
        )}
      </div>
    </div>
  );
}
