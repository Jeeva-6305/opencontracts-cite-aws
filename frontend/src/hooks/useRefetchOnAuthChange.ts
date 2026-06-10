import { useEffect } from "react";
import { useApolloClient } from "@apollo/client";
import { authToken } from "../graphql/cache";

/**
 * Refetches all active Apollo queries after an authenticated cache clear.
 *
 * All authentication changes (login, logout, token refresh, session expiry)
 * flow through `client.clearStore()` via the CacheManager. This hook
 * registers a single `onClearStore` callback that refetches every active
 * observable query once the clear completes, so mounted components
 * automatically receive data appropriate to the new auth context.
 *
 * The callback is skipped when there is no auth token (i.e. on logout),
 * since refetching anonymous data for a departing user is wasted work.
 *
 * ORDERING CONTRACT: Callers that clear auth state before calling
 * `CacheManager.resetOnAuthChange()` (e.g. logout in useNavMenu.ts) MUST
 * set `authToken("")` BEFORE the clearStore fires. This hook reads
 * `authToken()` synchronously inside the callback to decide whether to
 * skip refetch. Reversing the order would cause queries to refetch with
 * a still-valid token during logout.
 *
 * Note: This fires on ANY `clearStore()` call, not only auth-related ones.
 * All `clearStore()` calls currently go through `CacheManager.resetOnAuthChange`;
 * the `getCacheManager()` singleton exposes the same `CacheManager` instance,
 * so it also routes through `resetOnAuthChange`.
 *
 * Place this hook once near the app root (e.g., in App.tsx).
 *
 * Why `onClearStore` instead of watching `authStatusVar`:
 * - No race condition: the callback fires AFTER clearStore resolves.
 * - No-op when nothing is mounted (e.g., during initial AuthGate init).
 * - Works for every auth transition without tracking previous state.
 */
export function useRefetchOnAuthChange(): void {
  const client = useApolloClient();

  useEffect(() => {
    return client.onClearStore(async () => {
      // Skip refetch on logout — auth state is cleared before clearStore(),
      // so an empty token means we're transitioning to anonymous.
      if (!authToken()) {
        return;
      }

      try {
        await client.refetchQueries({ include: "active" });
      } catch (err) {
        console.warn("[useRefetchOnAuthChange] refetchQueries failed:", err);
      }
    });
  }, [client]);
}
