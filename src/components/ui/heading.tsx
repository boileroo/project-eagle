import * as React from 'react';
import { cn } from '@/lib/utils';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  glow?: boolean;
}

export function Heading({
  level = 1,
  glow = false,
  className,
  children,
  ...props
}: HeadingProps) {
  const Comp = `h${level}` as const;

  const baseStyles = 'font-heading font-bold';
  const sizeStyles = {
    1: 'text-5xl leading-tight',
    2: 'text-4xl leading-tight',
    3: 'text-3xl leading-snug',
    4: 'text-2xl leading-snug',
    5: 'text-xl leading-normal',
    6: 'text-lg leading-normal',
  };

  const glowStyles = glow ? 'drop-shadow-[0_0_20px_var(--color-primary)]' : '';
  const defaultColor = 'text-foreground';

  return (
    <Comp
      className={cn(
        baseStyles,
        sizeStyles[level],
        defaultColor,
        glowStyles,
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
