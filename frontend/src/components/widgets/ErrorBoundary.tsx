import React, { Component, ReactNode } from "react";
import { Button } from "@os-legal/ui";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

const ErrorContainer = styled.div`
  padding: 2rem;
  margin-top: 2rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
`;

const ErrorDetails = styled.pre`
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 1rem;
  font-size: 0.875rem;
`;

const ErrorAlert = styled.div`
  background: ${OS_LEGAL_COLORS.dangerSurface};
  color: ${OS_LEGAL_COLORS.dangerText};
  border: 1px solid ${OS_LEGAL_COLORS.dangerBorder};
  border-radius: 4px;
  padding: 1.5rem;
`;

/**
 * Error boundary component to catch and display errors gracefully
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
      return (
        <ErrorContainer>
          <ErrorAlert>
            <h3 style={{ margin: "0 0 0.5rem" }}>Something went wrong</h3>
            <p>{this.state.error.message}</p>

            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <ErrorDetails>
                {this.state.error.stack}
                {"\n\nComponent Stack:"}
                {this.state.errorInfo.componentStack}
              </ErrorDetails>
            )}

            <Button
              variant="primary"
              onClick={this.resetError}
              style={{ marginTop: "1rem" }}
            >
              Try Again
            </Button>
          </ErrorAlert>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}
