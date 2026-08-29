import { Bolt, Moon, Sun } from 'lucide-react';
import type { Theme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeSwitcherProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'web-slinger', label: 'Web-Slinger', icon: Bolt },
] as const;

export function ThemeSwitcher({ theme, onChange }: ThemeSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Appearance theme"
      data-depth="calm"
      className="theme-switcher flex w-full items-center rounded-xl border bg-background/90 p-1 shadow-sm sm:w-auto"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const selected = theme === value;
        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={selected ? 'default' : 'ghost'}
            aria-label={`${label} theme`}
            aria-pressed={selected}
            className={cn('min-w-0 flex-1 px-2.5 sm:flex-none', value === 'web-slinger' && 'web-theme-choice')}
            onClick={() => onChange(value)}
          >
            <Icon data-icon="inline-start" aria-hidden="true" />
            <span>{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
