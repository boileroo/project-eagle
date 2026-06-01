import { createContext } from 'react';

export type SetPageTheme = (theme: string | null) => void;

export const PageThemeContext = createContext<SetPageTheme | null>(null);

/**
 * No-op until a new design system is in place.
 */
export function useSetPageTheme(_theme: string | null) {
  // intentionally empty
}
