import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dropdown, DropdownOption } from "@os-legal/ui";
import { useQuery } from "@apollo/client";
import _ from "lodash";
import {
  GET_REGISTERED_EXTRACT_TASKS,
  GetRegisteredExtractTasksOutput,
} from "../../../graphql/queries";

interface ExtractTaskDropdownProps {
  read_only?: boolean;
  taskName?: string | undefined;
  style?: React.CSSProperties;
  onChange?: (taskName: string | null) => void;
}

export const ExtractTaskDropdown: React.FC<ExtractTaskDropdownProps> = ({
  read_only,
  style,
  onChange,
  taskName,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>();

  const { loading, error, data, refetch } =
    useQuery<GetRegisteredExtractTasksOutput>(GET_REGISTERED_EXTRACT_TASKS, {
      fetchPolicy: "network-only",
      notifyOnNetworkStatusChange: true,
    });

  useEffect(() => {
    refetch();
  }, [searchQuery]);

  const tasks = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.registeredExtractTasks).map(
      ([name, description]) => ({
        name,
        description: description as string,
      })
    );
  }, [data]);

  const debouncedSetSearchQuery = useCallback(
    _.debounce((query: string) => {
      setSearchQuery(query);
    }, 500),
    []
  );

  const handleSearchChange = (query: string) => {
    debouncedSetSearchQuery(query);
  };

  const handleSelectionChange = (value: string | string[] | null) => {
    if (onChange) {
      const selected = _.find(tasks, { name: value as string });
      onChange(selected ? selected.name : null);
    }
  };

  // Memoize options to prevent unnecessary recalculations
  const dropdownOptions = useMemo<DropdownOption[]>(
    () =>
      tasks.map((task) => ({
        value: task.name,
        label: task.name,
        description: task.description,
      })),
    [tasks]
  );

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <Dropdown
      mode="select"
      fluid
      searchable="async"
      disabled={read_only}
      options={dropdownOptions}
      value={taskName ?? null}
      placeholder="Select a task"
      onChange={read_only ? () => {} : handleSelectionChange}
      onSearchChange={handleSearchChange}
      loading={loading}
      style={style}
    />
  );
};
