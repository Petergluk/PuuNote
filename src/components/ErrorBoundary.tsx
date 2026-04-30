import { Component, ErrorInfo, ReactNode } from "react";
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
          <p className="mb-3">
            The component failed to render. Please try undoing your last action
            or reload the app.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 border border-red-300 rounded text-red-800 text-xs font-medium"
              aria-label="Try to recover from error"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-white text-xs font-medium"
              aria-label="Reload the application"
            >
              Reload App
            </button>
          </div>{" "}
        </div>
      );
    }
    return this.props.children;
  }
}
