import React from "react";

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
}

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      error: null,
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      error,
      hasError: true,
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6">
          <div className="max-w-lg rounded-2xl border border-border bg-card p-8 shadow-card">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The application ran into an unexpected problem. Refresh the page to
              try again.
            </p>
            <pre className="mt-4 overflow-auto rounded-xl bg-muted p-4 text-xs text-destructive">
              {this.state.error?.message ?? "Unknown application error"}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
