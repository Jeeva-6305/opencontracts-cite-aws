/**
 * CorpusMetadataSettings - Manage custom metadata fields for a corpus
 * Restyled to use OS-Legal design system
 */
import React, { useState, useEffect } from "react";
import { Button, IconButton, Table, Tooltip } from "@os-legal/ui";
import { ConfirmModal } from "../widgets/modals/ConfirmModal";
import { useQuery, useMutation } from "@apollo/client";
import { toast } from "react-toastify";
import styled from "styled-components";
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  Database,
} from "lucide-react";

import {
  GET_CORPUS_METADATA_COLUMNS,
  CREATE_METADATA_COLUMN,
  UPDATE_METADATA_COLUMN,
  DELETE_METADATA_COLUMN,
  GetCorpusMetadataColumnsInput,
  GetCorpusMetadataColumnsOutput,
  CreateMetadataColumnInput,
  CreateMetadataColumnOutput,
  UpdateMetadataColumnInput,
  UpdateMetadataColumnOutput,
  DeleteMetadataColumnInput,
  DeleteMetadataColumnOutput,
} from "../../graphql/metadataOperations";
import { MetadataColumn } from "../../types/metadata";
import { MetadataColumnModal } from "../widgets/modals/MetadataColumnModal";
import { ErrorMessage, LoadingState } from "../widgets/feedback";
import {
  OS_LEGAL_COLORS,
  OS_LEGAL_TYPOGRAPHY,
  OS_LEGAL_SPACING,
  OS_LEGAL_SHADOWS,
} from "../../assets/configurations/osLegalStyles";

interface CorpusMetadataSettingsProps {
  corpusId: string;
}

const Container = styled.div`
  padding: 0;
  height: 100%;
  background: transparent;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background: ${OS_LEGAL_COLORS.surfaceHover};
  border-radius: ${OS_LEGAL_SPACING.borderRadiusButton};
  border: 1px solid ${OS_LEGAL_COLORS.border};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const Title = styled.h3`
  font-family: ${OS_LEGAL_TYPOGRAPHY.fontFamilySerif};
  margin: 0 0 0.375rem 0;
  color: ${OS_LEGAL_COLORS.textPrimary};
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.02em;
`;

const HelperText = styled.p`
  font-family: ${OS_LEGAL_TYPOGRAPHY.fontFamilySans};
  color: ${OS_LEGAL_COLORS.textSecondary};
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
  max-width: 600px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  background: ${OS_LEGAL_COLORS.surface};
  border-radius: ${OS_LEGAL_SPACING.borderRadiusCard};
  border: 2px dashed ${OS_LEGAL_COLORS.border};
  color: ${OS_LEGAL_COLORS.textSecondary};

  .icon-wrapper {
    width: 64px;
    height: 64px;
    margin: 0 auto 1.25rem;
    border-radius: 50%;
    background: ${OS_LEGAL_COLORS.accentLight};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${OS_LEGAL_COLORS.accent};
  }

  h4 {
    font-family: ${OS_LEGAL_TYPOGRAPHY.fontFamilySerif};
    color: ${OS_LEGAL_COLORS.textPrimary};
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }

  p {
    font-family: ${OS_LEGAL_TYPOGRAPHY.fontFamilySans};
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    line-height: 1.5;
    color: ${OS_LEGAL_COLORS.textSecondary};
  }
`;

const StyledTableWrapper = styled.div`
  border-radius: ${OS_LEGAL_SPACING.borderRadiusCard};
  overflow: hidden;
  box-shadow: ${OS_LEGAL_SHADOWS.card};
  border: 1px solid ${OS_LEGAL_COLORS.border};
  background: ${OS_LEGAL_COLORS.surface};
  font-family: ${OS_LEGAL_TYPOGRAPHY.fontFamilySans};
`;

const OrderButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  button {
    padding: 0.25rem !important;
    border-radius: 4px !important;
    background: ${OS_LEGAL_COLORS.surface} !important;
    border: 1px solid ${OS_LEGAL_COLORS.border} !important;
    transition: all 0.15s ease !important;

    &:not(:disabled):hover {
      background: ${OS_LEGAL_COLORS.accent} !important;
      border-color: ${OS_LEGAL_COLORS.accent} !important;
      color: white !important;
    }

    &:disabled {
      opacity: 0.3 !important;
    }
  }
`;

const DataTypeBadge = styled.span<{ dataType: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.025em;

  background: ${(props) => {
    switch (props.dataType) {
      case "STRING":
      case "TEXT":
        return "rgba(59, 130, 246, 0.1)";
      case "INTEGER":
      case "FLOAT":
        return "rgba(245, 158, 11, 0.1)";
      case "BOOLEAN":
        return OS_LEGAL_COLORS.successLight;
      case "DATE":
      case "DATETIME":
        return OS_LEGAL_COLORS.accentLight;
      case "CHOICE":
      case "MULTI_CHOICE":
        return "rgba(236, 72, 153, 0.1)";
      case "JSON":
        return "rgba(139, 92, 246, 0.1)";
      default:
        return OS_LEGAL_COLORS.surfaceHover;
    }
  }};

  color: ${(props) => {
    switch (props.dataType) {
      case "STRING":
      case "TEXT":
        return OS_LEGAL_COLORS.primaryBlueHover;
      case "INTEGER":
      case "FLOAT":
        return OS_LEGAL_COLORS.folderIcon;
      case "BOOLEAN":
        return OS_LEGAL_COLORS.success;
      case "DATE":
      case "DATETIME":
        return OS_LEGAL_COLORS.accent;
      case "CHOICE":
      case "MULTI_CHOICE":
        return "#db2777";
      case "JSON":
        return "#7c3aed";
      default:
        return OS_LEGAL_COLORS.textSecondary;
    }
  }};
`;

const RequiredBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 100px;
  font-size: 0.6875rem;
  font-weight: 600;
  background: ${OS_LEGAL_COLORS.dangerLight};
  color: ${OS_LEGAL_COLORS.danger};
  border: 1px solid rgba(220, 38, 38, 0.2);
  margin-left: 0.5rem;
  letter-spacing: 0.025em;
  text-transform: uppercase;
`;

const AddFieldButton = styled(Button)`
  && {
    background: ${OS_LEGAL_COLORS.accent};
    color: white;
    border: none;
    padding: 0.75rem 1.25rem;
    font-weight: 600;
    border-radius: ${OS_LEGAL_SPACING.borderRadiusButton};
    transition: all 0.15s ease;
    box-shadow: 0 2px 8px ${OS_LEGAL_COLORS.accentLight};
    font-family: ${OS_LEGAL_TYPOGRAPHY.fontFamilySans};

    &:hover {
      background: ${OS_LEGAL_COLORS.accentHover};
      box-shadow: 0 4px 12px ${OS_LEGAL_COLORS.accentLight};
    }
  }
`;

const ActionButtonGroup = styled.div`
  display: inline-flex;
  gap: 4px;
`;

const ValidationInfo = styled.div`
  font-size: 0.8125rem;
  color: ${OS_LEGAL_COLORS.textSecondary};

  div {
    margin-bottom: 0.125rem;
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export const CorpusMetadataSettings = ({
  corpusId,
}: CorpusMetadataSettingsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<MetadataColumn | null>(
    null
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);
  const [columns, setColumns] = useState<MetadataColumn[]>([]);

  // Query to fetch existing metadata columns
  const { data, loading, error, refetch } = useQuery<
    GetCorpusMetadataColumnsOutput,
    GetCorpusMetadataColumnsInput
  >(GET_CORPUS_METADATA_COLUMNS, {
    variables: { corpusId },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (data?.corpusMetadataColumns) {
      setColumns(
        (data.corpusMetadataColumns as unknown as MetadataColumn[])
          .slice()
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      );
    }
  }, [data]);

  // Mutations
  const [createColumn] = useMutation<
    CreateMetadataColumnOutput,
    CreateMetadataColumnInput
  >(CREATE_METADATA_COLUMN, {
    onCompleted: (data) => {
      if (data.createMetadataColumn.ok) {
        toast.success("Metadata field created successfully");
        setColumns((prev) =>
          [...prev, data.createMetadataColumn.obj as unknown as MetadataColumn]
            .slice()
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        );
        refetch();
        setIsModalOpen(false);
      } else {
        toast.error(data.createMetadataColumn.message);
      }
    },
    onError: (error) => {
      toast.error(`Error creating field: ${error.message}`);
    },
  });

  const [updateColumn] = useMutation<
    UpdateMetadataColumnOutput,
    UpdateMetadataColumnInput
  >(UPDATE_METADATA_COLUMN, {
    onCompleted: (data) => {
      if (data.updateMetadataColumn.ok) {
        toast.success("Metadata field updated successfully");
        refetch();
        setEditingColumn(null);
        setIsModalOpen(false);
      } else {
        toast.error(data.updateMetadataColumn.message);
      }
    },
    onError: (error) => {
      toast.error(`Error updating field: ${error.message}`);
    },
  });

  const [deleteColumn] = useMutation<
    DeleteMetadataColumnOutput,
    DeleteMetadataColumnInput
  >(DELETE_METADATA_COLUMN, {
    onCompleted: (data) => {
      if (data.deleteMetadataColumn.ok) {
        toast.success("Metadata field deleted successfully");
        refetch();
      } else {
        toast.error(data.deleteMetadataColumn.message);
      }
    },
    onError: (error) => {
      toast.error(`Error deleting field: ${error.message}`);
    },
  });

  // Handle reordering with buttons
  const moveColumn = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;

    const items = Array.from(columns);
    const [movedItem] = items.splice(index, 1);
    items.splice(newIndex, 0, movedItem);

    setColumns(items.map((item, idx) => ({ ...item, orderIndex: idx })));
  };

  const handleCreate = async (columnData: Partial<MetadataColumn>) => {
    await createColumn({
      variables: {
        corpusId,
        name: columnData.name!,
        dataType: columnData.dataType!,
        validationConfig: columnData.validationConfig,
        defaultValue: columnData.defaultValue,
        helpText: columnData.helpText,
        displayOrder: columns.length,
      },
    });
  };

  const handleUpdate = async (columnData: Partial<MetadataColumn>) => {
    if (!editingColumn) return;

    await updateColumn({
      variables: {
        columnId: editingColumn.id,
        name: columnData.name,
        validationConfig: columnData.validationConfig,
        defaultValue: columnData.defaultValue,
        helpText: columnData.helpText,
      },
    });
  };

  const handleDelete = async () => {
    if (!columnToDelete) return;

    await deleteColumn({
      variables: {
        columnId: columnToDelete,
      },
    });

    setDeleteConfirmOpen(false);
    setColumnToDelete(null);
  };

  const openEditModal = (column: MetadataColumn) => {
    setEditingColumn(column);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingColumn(null);
  };

  if (loading) {
    return (
      <Container>
        <div data-testid="metadata-loading">
          <LoadingState message="Loading metadata fields..." />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage title="Failed to load metadata">
          <>
            {error.message}
            <br />
            <Button onClick={() => refetch()} style={{ marginTop: "0.5rem" }}>
              Retry
            </Button>
          </>
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <HeaderSection>
        <div>
          <Title>Custom Fields</Title>
          <HelperText>
            Define custom metadata fields for documents in this corpus. Fields
            can be edited directly in the document list view.
          </HelperText>
        </div>
        <AddFieldButton variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} style={{ marginRight: "0.5rem" }} />
          Add Field
        </AddFieldButton>
      </HeaderSection>

      {columns.length === 0 ? (
        <EmptyState>
          <div className="icon-wrapper">
            <Database size={28} />
          </div>
          <h4>No metadata fields defined</h4>
          <p>
            Create custom fields to track additional information about your
            documents.
          </p>
          <AddFieldButton
            variant="primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} style={{ marginRight: "0.5rem" }} />
            Create Your First Field
          </AddFieldButton>
        </EmptyState>
      ) : (
        <StyledTableWrapper>
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.HeadCell style={{ width: "6.25%" }}>
                  Order
                </Table.HeadCell>
                <Table.HeadCell>Field Name</Table.HeadCell>
                <Table.HeadCell>Data Type</Table.HeadCell>
                <Table.HeadCell>Validation</Table.HeadCell>
                <Table.HeadCell>Help Text</Table.HeadCell>
                <Table.HeadCell align="center">Actions</Table.HeadCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {columns.map((column, index) => (
                <Table.Row key={column.id} data-testid="metadata-column-row">
                  <Table.Cell>
                    <OrderButtons>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveColumn(index, "up")}
                        aria-label="Move up"
                      >
                        <ChevronUp size={14} />
                      </IconButton>
                      <IconButton
                        size="sm"
                        variant="ghost"
                        disabled={index === columns.length - 1}
                        onClick={() => moveColumn(index, "down")}
                        aria-label="Move down"
                      >
                        <ChevronDown size={14} />
                      </IconButton>
                    </OrderButtons>
                  </Table.Cell>
                  <Table.Cell>
                    <strong>{column.name}</strong>
                    {column.validationConfig?.required && (
                      <RequiredBadge>Required</RequiredBadge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <DataTypeBadge dataType={column.dataType}>
                      {column.dataType}
                    </DataTypeBadge>
                  </Table.Cell>
                  <Table.Cell>
                    <ValidationInfo>
                      {column.validationConfig?.choices && (
                        <div>
                          Choices: {column.validationConfig.choices.join(", ")}
                        </div>
                      )}
                      {column.validationConfig?.max_length && (
                        <div>
                          Max length: {column.validationConfig.max_length}
                        </div>
                      )}
                      {column.validationConfig?.min_value !== undefined && (
                        <div>
                          Min:{" "}
                          {column.validationConfig.min_value.toLocaleString()}
                        </div>
                      )}
                      {column.validationConfig?.max_value !== undefined && (
                        <div>
                          Max:{" "}
                          {column.validationConfig.max_value.toLocaleString()}
                        </div>
                      )}
                      {(!column.validationConfig ||
                        Object.keys(column.validationConfig).length === 0) &&
                        "—"}
                    </ValidationInfo>
                  </Table.Cell>
                  <Table.Cell>{column.helpText || "—"}</Table.Cell>
                  <Table.Cell align="center">
                    <ActionButtonGroup>
                      <Tooltip content="Edit field">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(column)}
                          aria-label="Edit field"
                        >
                          <Edit size={14} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Delete field">
                        <IconButton
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setColumnToDelete(column.id);
                            setDeleteConfirmOpen(true);
                          }}
                          aria-label="Delete field"
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    </ActionButtonGroup>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </StyledTableWrapper>
      )}

      <MetadataColumnModal
        open={isModalOpen}
        onClose={closeModal}
        onSave={editingColumn ? handleUpdate : handleCreate}
        column={editingColumn}
      />

      <ConfirmModal
        visible={deleteConfirmOpen}
        message="Are you sure you want to delete this metadata field? All values for this field will be permanently deleted."
        confirmLabel="Delete Field"
        cancelLabel="Cancel"
        yesAction={handleDelete}
        noAction={() => {
          setColumnToDelete(null);
        }}
        toggleModal={() => {
          setDeleteConfirmOpen(false);
        }}
      />
    </Container>
  );
};
