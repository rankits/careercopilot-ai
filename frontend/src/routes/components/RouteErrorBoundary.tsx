import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/atoms/Button';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches chunk-load / render failures inside lazy route trees so the shell
 * stays usable instead of a blank white screen.
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RouteErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route render failed', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          alignItems="center"
          display="flex"
          flexDirection="column"
          gap={2}
          justifyContent="center"
          minHeight="50vh"
          px={3}
          role="alert"
          textAlign="center"
        >
          <Typography component="h1" variant="h6">
            This page failed to load
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Try again, or reload if the problem continues.
          </Typography>
          <Box display="flex" gap={1.5}>
            <Button onClick={this.handleRetry} variant="outline">
              Try again
            </Button>
            <Button onClick={this.handleReload}>Reload</Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
