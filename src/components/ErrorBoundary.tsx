import React, { Component, ErrorInfo, ReactNode } from "react";
interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
}
export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };
  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
          {" "}
          <h2 className="font-bold mb-2">Something went wrong</h2>{" "}
          <p>
            The component failed to render. Please try undoing your last action.
          </p>{" "}
        </div>
      );
    }
    return this.props.children;
  }
}
