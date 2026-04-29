import { createLink } from '@tanstack/react-router';
import * as React from 'react';
import { cn } from '@/lib/utils';

const BasicNavLink = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>((props, ref) => {
  return (
    <a
      ref={ref}
      {...props}
      className={cn(
        'text-tokyo-red hover:text-tokyo-red/80 flex h-full items-center border-b-2 border-transparent px-1 text-xs font-semibold tracking-[0.15em] uppercase transition-colors',
        '[&.active]:text-tokyo-blue [&.active]:border-tokyo-blue',
        props.className,
      )}
    />
  );
});

BasicNavLink.displayName = 'BasicNavLink';

export const NavLink = createLink(BasicNavLink);
