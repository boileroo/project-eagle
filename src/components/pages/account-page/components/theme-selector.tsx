import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import { FormLabel } from '@/components/ui/form';
import { FormDescription } from '@/components/ui/form';

export function ThemeSelector() {
  const { theme } = useTheme();

  return (
    <div className="space-y-2">
      <FormLabel>Theme</FormLabel>
      <div className="flex items-center gap-3">
        <ThemeToggle size="icon-sm" />
        <span className="text-muted-foreground text-sm">
          {theme === 'dark' ? 'Dark mode' : 'Light mode'}
        </span>
      </div>
      <FormDescription>
        Choose your preferred appearance. Dark mode is easier on the eyes in low
        light.
      </FormDescription>
    </div>
  );
}
