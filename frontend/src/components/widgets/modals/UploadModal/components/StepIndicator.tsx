import React from "react";
import { FileText, Edit, FolderOpen, Check } from "lucide-react";
import {
  StepIndicatorContainer,
  StepChip,
  StepConnector,
} from "../UploadModalStyles";

export type UploadStep = "select" | "details" | "corpus" | "uploading";

interface Step {
  id: UploadStep;
  label: string;
  icon: React.ReactNode;
}

interface StepIndicatorProps {
  currentStep: UploadStep;
  /** Whether corpus step should be shown */
  showCorpusStep?: boolean;
}

const STEPS_WITH_CORPUS: Step[] = [
  { id: "select", label: "Select", icon: <FileText /> },
  { id: "details", label: "Details", icon: <Edit /> },
  { id: "corpus", label: "Corpus", icon: <FolderOpen /> },
];

const STEPS_WITHOUT_CORPUS: Step[] = [
  { id: "select", label: "Select", icon: <FileText /> },
  { id: "details", label: "Details", icon: <Edit /> },
];

/**
 * Step indicator showing progress through the upload wizard.
 * Displays completed, active, and pending steps.
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  showCorpusStep = true,
}) => {
  const steps = showCorpusStep ? STEPS_WITH_CORPUS : STEPS_WITHOUT_CORPUS;

  // Don't show step indicator during uploading
  if (currentStep === "uploading") {
    return null;
  }

  const getStepIndex = (stepId: UploadStep): number => {
    return steps.findIndex((s) => s.id === stepId);
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <StepIndicatorContainer>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            {index > 0 && <StepConnector $completed={isCompleted} />}
            <StepChip
              $active={isActive}
              $completed={isCompleted}
              data-step={step.id}
            >
              {isCompleted ? <Check /> : step.icon}
              {step.label}
            </StepChip>
          </React.Fragment>
        );
      })}
    </StepIndicatorContainer>
  );
};

export default StepIndicator;
