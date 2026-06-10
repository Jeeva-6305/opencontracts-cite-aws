import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";
import { useMutation } from "@apollo/client";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { IconButton } from "@os-legal/ui";
import { Trash2 } from "lucide-react";
import { Settings, Tags, Pencil } from "lucide-react";
import { Spinner } from "@os-legal/ui";
import {
  RequestDeleteAnalysisInputType,
  RequestDeleteAnalysisOutputType,
  REQUEST_DELETE_ANALYSIS,
} from "../../graphql/mutations";
import { GetAnalysesOutputs, GET_ANALYSES } from "../../graphql/queries";
import { AnalysisType, CorpusType } from "../../types/graphql-api";
import _ from "lodash";
import { PermissionTypes } from "../types";
import { getPermissions } from "../../utils/transform";
import { selectedAnalyses, selectedAnalysesIds } from "../../graphql/cache";
import useWindowDimensions from "../hooks/WindowDimensionHook";
import { MOBILE_VIEW_BREAKPOINT } from "../../assets/configurations/constants";
import { updateAnnotationSelectionParams } from "../../utils/navigationUtils";

interface AnalysisItemProps {
  analysis: AnalysisType;
  selected?: boolean;
  read_only?: boolean;
  compact?: boolean;
  onSelect?: () => any | never;
  corpus?: CorpusType | null | undefined;
}

const StyledCard = styled.div<{
  $useMobileLayout?: boolean;
  $selected?: boolean;
}>`
  display: flex;
  flex-direction: column;
  padding: 0.5em;
  margin: 0.75em;
  width: ${(props) => (props.$useMobileLayout ? "200px" : "300px")};
  min-width: ${(props) => (props.$useMobileLayout ? "200px" : "300px")};
  background-color: ${(props) =>
    props.$selected ? OS_LEGAL_COLORS.successSurface : "white"};
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  position: relative;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
`;

const CardContent = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
`;

const CardHeader = styled.div`
  font-size: 1.1em;
  font-weight: 700;
  word-break: break-word;
  margin-bottom: 0.5em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardMeta = styled.div`
  font-size: 0.9em;
  color: rgba(0, 0, 0, 0.4);
  margin-bottom: 0.5em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExtraContent = styled.div`
  padding-top: 0.5em;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
`;

const LabelContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
`;

const StyledLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0.25em 0.6em;
  font-size: 0.85em;
  font-weight: 500;
  background: ${OS_LEGAL_COLORS.surfaceLight};
  border: 1px solid ${OS_LEGAL_COLORS.border};
  border-radius: 4px;
  color: ${OS_LEGAL_COLORS.textTertiary};
`;

const DeleteButtonWrapper = styled.div`
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  opacity: 0.7;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
`;

const CardDescription = styled.div`
  max-height: 3.6em;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  position: relative;
  color: rgba(0, 0, 0, 0.68);
  font-size: 0.9em;
`;

const ReadMoreLink = styled.span`
  color: #4183c4;
  cursor: pointer;
  position: absolute;
  bottom: 0;
  right: 0;
  background: white;
  padding-left: 4px;
`;

export const AnalysisItem = ({
  analysis,
  selected,
  read_only,
  onSelect,
  compact,
  corpus: selectedCorpus,
}: AnalysisItemProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { width } = useWindowDimensions();
  const use_mobile_layout = width <= MOBILE_VIEW_BREAKPOINT;
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (descriptionRef.current) {
        const element = descriptionRef.current;
        setIsOverflowing(element.scrollHeight > element.clientHeight);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [analysis.analyzer.description]);

  const [requestDeleteAnalysis] = useMutation<
    RequestDeleteAnalysisOutputType,
    RequestDeleteAnalysisInputType
  >(REQUEST_DELETE_ANALYSIS, {
    variables: {
      id: analysis.id,
    },
    onCompleted: (data) => {
      toast.success("Analysis deleting...");
    },
    onError: (data) => {
      toast.error("Could not delete analysis...");
    },
    update: (cache, { data: delete_analysis_data }) => {
      if (!selectedCorpus) return;

      const cache_data: GetAnalysesOutputs | null = cache.readQuery({
        query: GET_ANALYSES,
        variables: { corpusId: selectedCorpus.id },
      });

      if (cache_data) {
        const new_cache_data = _.cloneDeep(cache_data);
        new_cache_data.analyses.edges = new_cache_data.analyses.edges.filter(
          (edge) => edge.node.id !== analysis.id
        );
        cache.writeQuery({
          query: GET_ANALYSES,
          variables: { corpusId: selectedCorpus.id },
          data: new_cache_data,
        });
      }
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedCorpus) {
      toast.error("No corpus selected");
      return;
    }
    selectedAnalyses([]);
    // Update URL - CentralRouteManager will set reactive var
    updateAnnotationSelectionParams(location, navigate, {
      analysisIds: [],
    });
    requestDeleteAnalysis();
  };

  const my_permissions = getPermissions(
    analysis.myPermissions ? analysis.myPermissions : []
  );
  const can_delete = my_permissions.includes(PermissionTypes.CAN_REMOVE);

  return (
    <StyledCard
      onClick={
        onSelect && analysis.analysisCompleted ? () => onSelect() : () => {}
      }
      $useMobileLayout={use_mobile_layout}
      $selected={selected}
    >
      {analysis.corpusAction && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "0.25em 0.5em",
            background: OS_LEGAL_COLORS.success,
            color: "white",
            fontSize: "0.75em",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            borderRadius: "4px 4px 0 0",
            zIndex: 1,
          }}
        >
          <Settings size={12} /> Action - {analysis.corpusAction.name}
        </div>
      )}
      <CardContent>
        {!read_only && can_delete && (
          <DeleteButtonWrapper>
            <IconButton
              aria-label={
                !selectedCorpus ? "No corpus selected" : "Delete analysis"
              }
              size="sm"
              variant="danger"
              onClick={handleDelete}
              disabled={!selectedCorpus}
            >
              <Trash2 size={14} />
            </IconButton>
          </DeleteButtonWrapper>
        )}
        {!analysis.analysisCompleted && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.85)",
              zIndex: 20,
            }}
          >
            <Spinner size="sm" />
            <span
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                color: OS_LEGAL_COLORS.textSecondary,
              }}
            >
              Processing...
            </span>
          </div>
        )}
        {analysis.analyzer.manifest?.label_set?.icon_data && (
          <img
            src={`data:image/png;base64,${analysis.analyzer.manifest.label_set.icon_data}`}
            alt="Label set icon"
            style={{
              float: "right",
              width: "35px",
              height: "35px",
              objectFit: "contain",
            }}
          />
        )}
        <CardHeader>{analysis.analyzer.analyzerId}</CardHeader>
        <CardMeta>
          <span className="date">
            <u>Author</u>:{" "}
            {analysis.analyzer.manifest?.metadata?.author_name || ""}
          </span>
        </CardMeta>
        {!compact && (
          <CardDescription>
            <div ref={descriptionRef}>
              {analysis.analyzer.description}
              {isOverflowing && !showFullDescription && (
                <ReadMoreLink
                  onClick={(
                    e: React.MouseEvent<HTMLSpanElement, MouseEvent>
                  ) => {
                    e.stopPropagation();
                    setShowFullDescription(true);
                  }}
                >
                  ...more
                </ReadMoreLink>
              )}
            </div>
          </CardDescription>
        )}
        {showFullDescription && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: `1px solid ${OS_LEGAL_COLORS.border}`,
              borderRadius: "8px",
              padding: "1em",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              zIndex: 10,
              fontSize: "0.9em",
              color: "rgba(0, 0, 0, 0.68)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowFullDescription(false);
            }}
          >
            {analysis.analyzer.description}
          </div>
        )}
      </CardContent>
      <ExtraContent>
        <LabelContainer>
          <StyledLabel>
            <Tags size={12} />
            {analysis?.analyzer?.annotationlabelSet?.totalCount || 0} Labels
          </StyledLabel>
          <StyledLabel>
            <Pencil size={12} /> {analysis.annotations.totalCount} Annot.
          </StyledLabel>
        </LabelContainer>
      </ExtraContent>
    </StyledCard>
  );
};
