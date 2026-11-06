import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from './States';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error inesperado en la interfaz:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-fallback">
          <ErrorState
            title="La interfaz encontró un problema"
            message={
              this.state.error.message ||
              'Ocurrió un error inesperado. Puedes reintentar o recargar la página.'
            }
            onRetry={() => this.setState({ error: null })}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
