import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Uncaught error", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const showDevDetails = import.meta.env.DEV && this.state.error;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">문제가 발생했습니다</h1>
          <p className="mt-2 text-muted-foreground">
            일시적인 오류일 수 있어요. 새로고침 후 다시 시도해주세요.
          </p>

          {showDevDetails ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-left text-xs text-foreground">
              {this.state.error?.stack ?? this.state.error?.message}
            </pre>
          ) : null}

          <div className="mt-6 flex items-center justify-center">
            <Button onClick={this.handleReload}>새로고침</Button>
          </div>
        </div>
      </div>
    );
  }
}
