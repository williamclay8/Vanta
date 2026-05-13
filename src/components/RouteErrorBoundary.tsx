import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

type RouteErrorBoundaryInnerProps = RouteErrorBoundaryProps & {
  routeKey: string;
};

type RouteErrorBoundaryState = {
  error: Error | null;
};

class RouteErrorBoundaryInner extends Component<
  RouteErrorBoundaryInnerProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void error;
    void errorInfo;
  }

  componentDidUpdate(previousProps: RouteErrorBoundaryInnerProps) {
    if (previousProps.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="route-error-boundary route-fallback" role="alert">
        <span className="route-fallback__eyebrow">Route recovery</span>
        <h1>Something went wrong</h1>
        <p>
          <strong>Nothing moved.</strong> No wallet action was submitted by this screen, and
          production privacy is not enabled. Choose a checked route and try again.
        </p>
        <div className="route-fallback__actions" aria-label="Route recovery actions">
          <Link className="route-fallback__action route-fallback__action--primary" to="/app/shield">
            Start with Shield
          </Link>
          <Link className="route-fallback__action" to="/docs/security">
            Read security limits
          </Link>
          <Link className="route-fallback__action" to="/docs/trust">
            Review trust docs
          </Link>
        </div>
      </main>
    );
  }
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  const location = useLocation();

  return (
    <RouteErrorBoundaryInner routeKey={location.pathname}>{children}</RouteErrorBoundaryInner>
  );
}
