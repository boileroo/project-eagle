import * as React from 'react';
import { cn } from '@/lib/utils';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  glow?: boolean;
  color?: 'default' | 'white' | 'red' | 'blue' | 'green';
}

export function Heading({
  level = 1,
  glow = false,
  color = 'default',
  className,
  children,
  ...props
}: HeadingProps) {
  const Comp = `h${level}` as const;

  const baseStyles = 'font-heading font-bold tracking-tight';

  const sizeStyles = {
    1: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl',
    2: 'text-3xl sm:text-4xl',
    3: 'text-2xl sm:text-3xl',
    4: 'text-xl sm:text-2xl',
    5: 'text-lg sm:text-xl',
    6: 'text-base sm:text-lg',
  };

  const colorStyles = {
    default: 'text-foreground',
    white: 'text-tokyo-white',
    red: 'text-tokyo-red',
    blue: 'text-tokyo-blue',
    green: 'text-tokyo-green',
  };

  const glowStyles = glow ? 'drop-shadow-[0_0_20px_currentColor]' : '';

  return (
    <Comp
      className={cn(
        baseStyles,
        sizeStyles[level],
        colorStyles[color],
        glowStyles,
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
