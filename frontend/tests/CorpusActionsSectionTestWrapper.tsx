import React from "react";
import { MockedProvider, MockedResponse } from "@apollo/client/testing";
import { Provider } from "jotai";

import { CorpusActionsSection } from "../src/components/corpuses/settings/CorpusActionsSection";

interface CorpusAction {
  id: string;
  name: string;
  trigger: string;
  disabled: boolean;
  runOnAllCorpuses?: boolean;
  analyzer?: { id: string; name: string } | null;
  fieldset?: { id: string; name: string } | null;
  agentConfig?: { id: string; name: string; description?: string } | null;
  taskInstructions?: string | null;
  preAuthorizedTools?: string[] | null;
  creator: { username: string };
  created: string;
  sourceTemplate?: { id: string; name: string } | null;
}

interface Props {
  mocks: ReadonlyArray<MockedResponse>;
  corpusId: string;
  actions: CorpusAction[];
  onAddAction?: () => void;
  onEditAction?: () => void;
  onDeleteAction?: () => void;
  onUpdate?: () => void;
  isSuperuser?: boolean;
}

export const CorpusActionsSectionTestWrapper: React.FC<Props> = ({
  mocks,
  corpusId,
  actions,
  onAddAction = () => {},
  onEditAction = () => {},
  onDeleteAction = () => {},
  onUpdate = () => {},
  isSuperuser,
}) => {
  return (
    <Provider>
      <MockedProvider mocks={mocks} addTypename={false}>
        <CorpusActionsSection
          corpusId={corpusId}
          actions={actions as any}
          onAddAction={onAddAction}
          onEditAction={onEditAction as any}
          onDeleteAction={onDeleteAction as any}
          onUpdate={onUpdate}
          isSuperuser={isSuperuser}
        />
      </MockedProvider>
    </Provider>
  );
};
