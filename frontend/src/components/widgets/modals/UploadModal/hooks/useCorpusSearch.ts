import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@apollo/client";
import _ from "lodash";
import {
  GET_CORPUSES,
  GetCorpusesInputs,
  GetCorpusesOutputs,
} from "../../../../../graphql/queries";
import { CorpusType } from "../../../../../types/graphql-api";
import { getPermissions } from "../../../../../utils/transform";
import { PermissionTypes } from "../../../../types";
import { DEBOUNCE } from "../../../../../assets/configurations/constants";

interface UseCorpusSearchProps {
  /** Skip query when modal is closed */
  skip?: boolean;
  /** Filter to only show corpuses user can update */
  requireUpdatePermission?: boolean;
}

interface UseCorpusSearchReturn {
  corpuses: CorpusType[];
  loading: boolean;
  error: any;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSetSearchTerm: (term: string) => void;
  refetch: () => void;
}

/**
 * Hook for searching and filtering corpuses.
 * Includes debounced search and permission filtering.
 */
export function useCorpusSearch({
  skip = false,
  requireUpdatePermission = true,
}: UseCorpusSearchProps = {}): UseCorpusSearchReturn {
  const [searchTerm, setSearchTerm] = useState("");

  // Memoize variables to prevent Apollo refetch loops
  const variables = useMemo(() => ({ textSearch: searchTerm }), [searchTerm]);

  const { data, loading, error, refetch } = useQuery<
    GetCorpusesOutputs,
    GetCorpusesInputs
  >(GET_CORPUSES, {
    variables,
    notifyOnNetworkStatusChange: true,
    skip,
  });

  // Note: No useEffect for refetch needed - Apollo's variables reactivity
  // automatically refetches when searchTerm (and thus variables) changes.

  // Create stable debounced function ref
  const debouncedFnRef = useRef(
    _.debounce(
      (term: string) => {
        setSearchTerm(term);
      },
      DEBOUNCE.CORPUS_SEARCH_MS,
      { maxWait: DEBOUNCE.CORPUS_SEARCH_MAX_WAIT_MS }
    )
  );

  // Debounced search term setter
  const debouncedSetSearchTerm = useCallback((term: string) => {
    debouncedFnRef.current(term);
  }, []);

  // Cleanup debounced function on unmount to prevent memory leaks
  useEffect(() => {
    const debouncedFn = debouncedFnRef.current;
    return () => {
      debouncedFn.cancel();
    };
  }, []);

  // Extract and filter corpuses
  const corpuses = useMemo(() => {
    const allCorpuses = data?.corpuses?.edges
      ? data.corpuses.edges
          .map((edge) => edge?.node)
          .filter((item): item is CorpusType => !!item)
      : [];

    if (!requireUpdatePermission) {
      return allCorpuses;
    }

    // Filter to corpuses user can update
    return allCorpuses.filter((corpus) =>
      getPermissions(corpus?.myPermissions || []).includes(
        PermissionTypes.CAN_UPDATE
      )
    );
  }, [data, requireUpdatePermission]);

  return {
    corpuses,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    debouncedSetSearchTerm,
    refetch,
  };
}

export default useCorpusSearch;
