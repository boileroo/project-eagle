import { Link } from '@tanstack/react-router';
import { UserCircle, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Text } from '@/components/ui/text';

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface UserMenuProps {
  user: AppUser;
  onSignOut: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  return (
    <div className="hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="bg-tokyo-blue/10 text-tokyo-blue hover:bg-tokyo-blue/20 hover:text-tokyo-blue flex items-center gap-2 rounded-full px-4 py-2 transition-colors"
          >
            <UserCircle className="h-5 w-5" />
            <Text size="sm" asChild>
              <span className="font-semibold tracking-wide uppercase">
                {user.displayName ?? user.email}
              </span>
            </Text>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <Text size="sm" className="leading-none font-medium">
                {user.displayName ?? 'Account'}
              </Text>
              <Text size="xs" color="muted" className="leading-none">
                {user.email}
              </Text>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              to="/account"
              className="flex w-full cursor-pointer items-center"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onSignOut}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
