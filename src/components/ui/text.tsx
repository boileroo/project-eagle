import * as React from 'react';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'default' | 'muted' | 'primary' | 'destructive' | 'white';
  asChild?: boolean;
}

export function Text({
  size = 'base',
  weight = 'normal',
  color = 'default',
  asChild = false,
  className,
  children,
  ...props
}: TextProps) {
  const Comp = asChild ? Slot.Root : 'p';

  const sizes = {
    xs: 'text-xs', // 12px — timestamps, counts
    sm: 'text-sm', // 14px — secondary body, descriptions
    base: 'text-base', // 16px — primary body
    lg: 'text-lg', // 18px
    xl: 'text-xl', // 20px
  };

  const weights = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const colors = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
    destructive: 'text-destructive',
    white: 'text-white',
  };

  return (
    <Comp
      className={cn(sizes[size], weights[weight], colors[color], className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
