import { createLink } from '@tanstack/react-router';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const linkVariants = cva(
  'rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'text-primary font-semibold',
        subtle: 'text-foreground/90 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface BasicLinkProps
  extends
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof linkVariants> {}

const BasicLink = React.forwardRef<HTMLAnchorElement, BasicLinkProps>(
  ({ variant, className, ...props }, ref) => (
    <a
      ref={ref}
      {...props}
      className={cn(linkVariants({ variant }), className)}
    />
  ),
);

BasicLink.displayName = 'BasicLink';

export const Link = createLink(BasicLink);
