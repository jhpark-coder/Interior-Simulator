import type { ReactNode } from "react";
import { Component } from "react";
import "./ErrorBoundary.css";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error) {
    console.error("App crashed", error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong.</h1>
          <p>{this.state.message ?? "Unexpected error"}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
