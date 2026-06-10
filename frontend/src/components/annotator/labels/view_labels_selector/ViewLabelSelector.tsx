import React, { useMemo } from "react";
import { Dropdown, DropdownOption } from "@os-legal/ui";
import _ from "lodash";
import { AnnotationLabelType, LabelType } from "../../../../types/graphql-api";
import { useCorpusState } from "../../context/CorpusAtom";
import {
  useAnnotationControls,
  useAnnotationDisplay,
} from "../../context/UISettingsAtom";
import { useAtomValue } from "jotai";
import { allAnnotationsAtom } from "../../context/AnnotationAtoms";

export const ViewLabelSelector: React.FC = () => {
  const { humanSpanLabels, spanLabels } = useCorpusState();
  const { showStructural } = useAnnotationDisplay();
  const allAnnotations = useAtomValue(allAnnotationsAtom);

  const allLabelChoices = useMemo(() => {
    // Start with corpus labels as a base
    const corpusLabels = [...humanSpanLabels, ...spanLabels];

    // Extract labels from annotations based on visibility
    const relevantAnnotations = showStructural
      ? allAnnotations // When showing structural, include ALL annotations
      : allAnnotations.filter((ann) => !ann.structural); // Otherwise exclude structural

    // Extract unique labels from these annotations
    const annotationLabels = relevantAnnotations
      .map((ann) => ann.annotationLabel)
      .filter((label) => label != null); // Filter out null/undefined labels

    // Combine corpus labels with annotation labels
    const combinedLabels = [...corpusLabels, ...annotationLabels];

    // Remove duplicates by id and include both SpanLabel and TokenLabel types
    // (structural annotations might use either type)
    const uniqueLabels = _.uniqBy(combinedLabels, "id").filter((label) => {
      return (
        label.labelType === LabelType.SpanLabel ||
        label.labelType === LabelType.TokenLabel
      );
    });

    return uniqueLabels;
  }, [humanSpanLabels, spanLabels, showStructural, allAnnotations]);

  const annotationControls = useAnnotationControls();
  const { spanLabelsToView, setSpanLabelsToView } = annotationControls;

  const handleChange = (value: string | string[] | null) => {
    const selectedLabels = allLabelChoices.filter((l) =>
      Array.isArray(value) ? value.includes(l.id) : false
    );
    setSpanLabelsToView(selectedLabels);
  };

  const labelOptions = useMemo<DropdownOption[]>(() => {
    return allLabelChoices.map((label: AnnotationLabelType) => ({
      value: label.id,
      label: label.text || "?",
    }));
  }, [allLabelChoices]);

  return (
    <Dropdown
      mode="multiselect"
      searchable="local"
      onChange={handleChange}
      value={spanLabelsToView ? spanLabelsToView.map((l) => l.id) : []}
      placeholder="Only Show Labels"
      fluid
      options={labelOptions}
      style={{ minWidth: "10em" }}
    />
  );
};
