import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Button,
  Dropdown,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@os-legal/ui";
import styled from "styled-components";
import { toast } from "react-toastify";

import { CORPUS_DOCUMENTS_TOC_LIMIT } from "../../assets/configurations/constants";
import { ErrorMessage, InfoMessage } from "../widgets/feedback";
import {
  GET_CORPUS_DOCUMENTS_FOR_TOC,
  GetCorpusDocumentsForTocOutput,
} from "../../graphql/queries";
import {
  RUN_CORPUS_ACTION,
  RunCorpusActionInput,
  RunCorpusActionOutput,
} from "../../graphql/mutations";

const StyledModalWrapper = styled.div`
  .oc-modal {
    max-width: 480px;
    width: 100%;
  }
`;

interface RunCorpusActionModalProps {
  open: boolean;
  corpusId: string;
  actionId: string;
  actionName: string;
  onClose: () => void;
}

export const RunCorpusActionModal: React.FC<RunCorpusActionModalProps> = ({
  open,
  corpusId,
  actionId,
  actionName,
  onClose,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Reset document selection when the action changes (e.g. modal reopened
  // for a different action without unmounting).
  useEffect(() => {
    setSelectedDocId(null);
  }, [actionId]);

  const {
    data: docsData,
    loading: docsLoading,
    error: docsError,
  } = useQuery<GetCorpusDocumentsForTocOutput>(GET_CORPUS_DOCUMENTS_FOR_TOC, {
    variables: { corpusId, first: CORPUS_DOCUMENTS_TOC_LIMIT },
    skip: !open,
  });

  const totalCount = docsData?.documents?.totalCount ?? 0;
  const isLimitExceeded = totalCount > CORPUS_DOCUMENTS_TOC_LIMIT;

  const [runAction, { loading: running }] = useMutation<
    RunCorpusActionOutput,
    RunCorpusActionInput
  >(RUN_CORPUS_ACTION);

  const documentOptions =
    docsData?.documents?.edges?.map(({ node }) => ({
      value: node.id,
      label: node.title,
    })) ?? [];

  const handleRun = async () => {
    if (!selectedDocId) return;
    try {
      const { data } = await runAction({
        variables: { corpusActionId: actionId, documentId: selectedDocId },
      });
      if (data?.runCorpusAction?.ok) {
        toast.success("Action queued. Check the execution trail for results.");
        handleClose();
      } else {
        toast.error(
          data?.runCorpusAction?.message ?? "Failed to queue action."
        );
      }
    } catch {
      toast.error("Failed to queue action.");
    }
  };

  const handleClose = () => {
    setSelectedDocId(null);
    onClose();
  };

  return (
    <StyledModalWrapper>
      <Modal open={open} onClose={handleClose} size="sm">
        <ModalHeader title={`Run: ${actionName}`} onClose={handleClose} />
        <ModalBody>
          <p>Select a document to run this action against:</p>
          {docsError && (
            <ErrorMessage title="Failed to load documents">
              Please try again or check your permissions for this corpus.
            </ErrorMessage>
          )}
          <Dropdown
            placeholder="Select document..."
            fluid
            mode="select"
            searchable="local"
            loading={docsLoading}
            options={documentOptions}
            value={selectedDocId}
            onChange={(value) => setSelectedDocId(value as string)}
          />
          {isLimitExceeded && (
            <InfoMessage>
              Showing first {CORPUS_DOCUMENTS_TOC_LIMIT} of {totalCount}{" "}
              documents. Use the search box above to filter.
            </InfoMessage>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={running}
            disabled={!selectedDocId || running}
            onClick={handleRun}
          >
            Run
          </Button>
        </ModalFooter>
      </Modal>
    </StyledModalWrapper>
  );
};
