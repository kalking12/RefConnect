import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
          <div className="w-full max-w-md text-center">
            <h1 className="mb-3 text-3xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="mb-8 text-muted-foreground">
              Reload the page to try again.
            </p>
            <Button
              type="button"
              className="min-h-11"
              onClick={() => window.location.reload()}
            >
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reload page
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
