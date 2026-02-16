import { QueryClient } from '@tanstack/react-query';
import type {
  PersistedClient,
  Persister,
} from '@tanstack/query-persist-client-core';
import type { DehydrateOptions, Query } from '@tanstack/query-core';
import { del, get, set } from 'idb-keyval';
import { submitScoreFn } from '@/lib/scores.server';
import type { SubmitScoreInput } from '@/lib/validators';
import { toast } from 'sonner';

const STORAGE_KEY = 'project-eagle-offline-cache';
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const OFFLINE_SYNC_TOAST_DELAY_MS = 750;

let offlineSyncToastTimeout: ReturnType<typeof setTimeout> | null = null;
let offlineSyncCount = 0;

const scheduleOfflineSyncToast = (count = 1) => {
  if (typeof window === 'undefined') return;
  offlineSyncCount += count;
  if (offlineSyncToastTimeout) {
    clearTimeout(offlineSyncToastTimeout);
  }
  offlineSyncToastTimeout = setTimeout(() => {
    if (offlineSyncCount === 1) {
      toast.success('Score synced.');
    } else if (offlineSyncCount > 1) {
      toast.success(`Synced ${offlineSyncCount} scores.`);
    }
    offlineSyncCount = 0;
    offlineSyncToastTimeout = null;
  }, OFFLINE_SYNC_TOAST_DELAY_MS);
};

export const registerMutationDefaults = (queryClient: QueryClient) => {
  type SubmitScoreVariables = SubmitScoreInput & {
    clientMeta?: { savedOffline?: boolean };
  };
  queryClient.setMutationDefaults(['submit-score'], {
    mutationFn: (variables: SubmitScoreVariables) => {
      const { clientMeta: _clientMeta, ...data } = variables;
      return submitScoreFn({ data });
    },
    onSuccess: (_data, variables) => {
      if (!variables) return;
      const wasSavedOffline = variables.clientMeta?.savedOffline ?? false;
      if (wasSavedOffline) {
        scheduleOfflineSyncToast();
      }
    },
    onSettled: (_data, _error, variables) => {
      if (!variables) return;
      void queryClient.invalidateQueries({
        queryKey: ['round', variables.roundId, 'scorecard'],
      });
    },
    retry: 3,
  });
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: DEFAULT_MAX_AGE_MS,
        staleTime: 1000 * 30,
        retry: 3,
      },
      mutations: {
        networkMode: 'online',
        retry: 3,
      },
    },
  });

let browserQueryClient: QueryClient | null = null;

export const getQueryClient = () => {
  if (typeof window === 'undefined') {
    const queryClient = createQueryClient();
    registerMutationDefaults(queryClient);
    return queryClient;
  }

  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
    registerMutationDefaults(browserQueryClient);
  }

  return browserQueryClient;
};

let throttleId: ReturnType<typeof setTimeout> | null = null;

export const queryPersister: Persister = {
  persistClient: async (persistedClient) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (throttleId) {
      clearTimeout(throttleId);
    }
    throttleId = setTimeout(() => {
      void set(STORAGE_KEY, persistedClient as PersistedClient);
    }, 1000);
  },
  restoreClient: async () => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const cached = (await get(STORAGE_KEY)) as PersistedClient | undefined;
    if (!cached || !cached.timestamp) {
      return undefined;
    }
    if (Date.now() - cached.timestamp > DEFAULT_MAX_AGE_MS) {
      await del(STORAGE_KEY);
      return undefined;
    }
    return cached;
  },
  removeClient: async () => {
    if (typeof window === 'undefined') {
      return;
    }
    if (throttleId) {
      clearTimeout(throttleId);
      throttleId = null;
    }
    await del(STORAGE_KEY);
  },
};

export const shouldPersistQuery = (queryKey: unknown): boolean => {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return false;
  }

  const [scope] = queryKey;
  if (typeof scope !== 'string') {
    return false;
  }

  return ['round', 'tournament', 'competition', 'course'].includes(scope);
};

export const dehydrateOptions: DehydrateOptions = {
  shouldDehydrateQuery: (query: Query) =>
    query.state.status === 'success' && shouldPersistQuery(query.queryKey),
};
