import { Component, ReactNode, ErrorInfo } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundaryClass - Catches React rendering errors
 */
class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-xl bg-[#231F1F] border border-[#3D3D3D]">
            <div className="flex items-center gap-3 mb-4">
              <i className="ri-error-warning-line text-3xl text-[#fa4d4d]"></i>
              <h1 className="text-2xl font-bold text-[#F5F5F5]">
                Oops! Something went wrong
              </h1>
            </div>

            <p className="text-[#9B9B9B] mb-6">
              An unexpected error occurred. Please try again or refresh the page.
            </p>

            {this.state.error && (
              <details className="mb-6 p-4 rounded-lg bg-[#141414] border border-[#3D3D3D]">
                <summary className="cursor-pointer text-sm text-[#9B9B9B] mb-2 font-medium">
                  Technical details
                </summary>
                <pre className="text-xs text-[#fa4d4d] overflow-x-auto mt-2 whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="w-full px-4 py-3 rounded-xl bg-[#36D399] text-[#141414] font-semibold hover:bg-[#2bb881] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorBoundary - Wrapping functional component that integrates React Query reset functionality
 */
export function ErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <ErrorBoundaryClass onReset={reset} fallback={fallback}>
      {children}
    </ErrorBoundaryClass>
  );
}
