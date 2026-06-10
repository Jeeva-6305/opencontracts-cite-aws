/**
 * useCacheManager - React hook for proactive Apollo cache management
 *
 * This hook provides access to the CacheManager for components that need
 * to trigger cache operations (e.g., on auth changes, entity CRUD).
 *
 * Related to Issue #694 - Apollo Cache Stale Data Problem
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const { resetOnAuthChange } = useCacheManager();
 *
 *   const handleLogout = async () => {
 *     // refetchActive defaults to false — post-clear refetching is handled
 *     // by the useRefetchOnAuthChange hook (App.tsx).
 *     await resetOnAuthChange({ reason: "user_logout" });
 *     // ... rest of logout logic
 *   };
 *
 *   return <button onClick={handleLogout}>Logout</button>;
 * }
 * ```
 */

import { useCallback, useMemo } from "react";
import {
  useApolloClient,
  ApolloClient,
  NormalizedCacheObject,
} from "@apollo/client";
import {
  CacheManager,
  CacheResetOptions,
  InvalidationOptions,
  CacheOperationResult,
} from "../services/cacheManager";

// ============================================================================
// Types
// ============================================================================

/**
 * Return type of the useCacheManager hook
 */
export interface UseCacheManagerReturn {
  /**
   * Resets the entire cache. Refetch of active queries is handled
   * separately by the `useRefetchOnAuthChange` hook (registered at the
   * app root). The `refetchActive` flag defaults to `false`.
   * Use this on authentication state changes (login/logout).
   */
  resetOnAuthChange: (
    options?: CacheResetOptions
  ) => Promise<CacheOperationResult>;

  /**
   * Refreshes all active queries without clearing the cache.
   * Use this for a "soft refresh" of displayed data.
   */
  refreshActiveQueries: (reason?: string) => Promise<CacheOperationResult>;

  /**
   * Invalidates queries related to a specific entity type.
   * Use this after entity CRUD operations.
   */
  invalidateEntityQueries: (
    options: InvalidationOptions
  ) => Promise<CacheOperationResult>;

  /**
   * Convenience method to invalidate document-related queries.
   */
  invalidateDocumentQueries: (
    corpusId?: string,
    reason?: string
  ) => Promise<CacheOperationResult>;

  /**
   * Convenience method to invalidate corpus-related queries.
   */
  invalidateCorpusQueries: (reason?: string) => Promise<CacheOperationResult>;

  /**
   * Logs the current cache size for debugging.
   */
  logCacheSize: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook that provides access to cache management operations.
 *
 * This hook creates a CacheManager instance using the current Apollo Client
 * and exposes its methods in a React-friendly way.
 *
 * The CacheManager instance is memoized to prevent unnecessary recreations.
 */
export function useCacheManager(): UseCacheManagerReturn {
  const client = useApolloClient() as ApolloClient<NormalizedCacheObject>;

  // Create a memoized CacheManager instance for this client
  const cacheManager = useMemo(() => {
    return new CacheManager(client);
  }, [client]);

  // Memoize all the callback functions to maintain stable references
  const resetOnAuthChange = useCallback(
    (options?: CacheResetOptions) => cacheManager.resetOnAuthChange(options),
    [cacheManager]
  );

  const refreshActiveQueries = useCallback(
    (reason?: string) => cacheManager.refreshActiveQueries(reason),
    [cacheManager]
  );

  const invalidateEntityQueries = useCallback(
    (options: InvalidationOptions) =>
      cacheManager.invalidateEntityQueries(options),
    [cacheManager]
  );

  const invalidateDocumentQueries = useCallback(
    (corpusId?: string, reason?: string) =>
      cacheManager.invalidateDocumentQueries(corpusId, reason),
    [cacheManager]
  );

  const invalidateCorpusQueries = useCallback(
    (reason?: string) => cacheManager.invalidateCorpusQueries(reason),
    [cacheManager]
  );

  const logCacheSize = useCallback(
    () => cacheManager.logCacheSize(),
    [cacheManager]
  );

  return {
    resetOnAuthChange,
    refreshActiveQueries,
    invalidateEntityQueries,
    invalidateDocumentQueries,
    invalidateCorpusQueries,
    logCacheSize,
  };
}

export default useCacheManager;
