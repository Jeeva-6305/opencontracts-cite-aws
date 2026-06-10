import React, { useState } from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { ExtractTaskDropdown } from "../src/components/widgets/selectors/ExtractTaskDropdown";

interface WrapperProps {
  taskName?: string;
  read_only?: boolean;
  mocks?: MockedResponse[];
}

export const ExtractTaskDropdownTestWrapper: React.FC<WrapperProps> = ({
  taskName: initialTask,
  read_only = false,
  mocks = [],
}) => {
  const [selectedTask, setSelectedTask] = useState<string | undefined>(
    initialTask
  );

  const handleChange = (taskName: string | null) => {
    setSelectedTask(taskName ?? undefined);
  };

  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <div style={{ padding: 24, maxWidth: 500 }}>
        <ExtractTaskDropdown
          taskName={selectedTask}
          read_only={read_only}
          onChange={handleChange}
        />
        <span
          data-testid="selected-task"
          style={{ position: "absolute", left: -9999 }}
        >
          {selectedTask ?? ""}
        </span>
      </div>
    </MockedProvider>
  );
};
