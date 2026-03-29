import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'dev:role-override';

export type DevRoleOverride = 'commissioner' | 'marker' | 'player';

const subscribers = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function getSnapshot(): DevRoleOverride | null {
  if (!import.meta.env.DEV) return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'commissioner' || stored === 'marker' || stored === 'player') {
    return stored;
  }
  return null;
}

function getServerSnapshot(): DevRoleOverride | null {
  return null;
}

export function setDevRoleOverride(role: DevRoleOverride | null): void {
  if (role === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, role);
  }
  subscribers.forEach((cb) => cb());
}

export function useDevRoleOverride(): DevRoleOverride | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
