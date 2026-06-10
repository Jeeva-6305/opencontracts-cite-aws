import React, { useEffect } from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { MemoryRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { backendUserObj } from "../src/graphql/cache";
import { WorkerAccountManagement } from "../src/components/admin/WorkerAccountManagement";

interface WrapperProps {
  mocks?: MockedResponse[];
}

export const WorkerAccountManagementTestWrapper: React.FC<WrapperProps> = ({
  mocks = [],
}) => {
  useEffect(() => {
    backendUserObj({ isSuperuser: true } as any);
    return () => {
      backendUserObj(null);
    };
  }, []);

  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={["/admin/worker-accounts"]}>
        <WorkerAccountManagement />
        <ToastContainer />
      </MemoryRouter>
    </MockedProvider>
  );
};
