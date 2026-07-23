import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError } from '../lib/lazyWithRetry';
import { createLogger } from '../lib/logger';

const log = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Without this, a rejected dynamic `import()` from a
 * lazy-loaded route (very common after a PWA redeploy) unmounts the entire
 * tree and leaves the user on a blank white screen forever — most visibly
 * right after login, when `/dashboard` is the first never-fetched chunk.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surfaces in DevTools and the iOS Web Inspector.
    log.error('uncaught render error', {
      err: error,
      componentStack: info.componentStack,
    });
  }

  private handleReload = (): void => {
    try {
      sessionStorage.removeItem('ninerlog:chunk-reloaded');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  private handleGoHome = (): void => {
    try {
      sessionStorage.removeItem('ninerlog:chunk-reloaded');
    } catch {
      /* ignore */
    }
    window.location.href = '/';
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isChunk = isChunkLoadError(error);
    const title = isChunk ? 'Update available' : 'Something went wrong';
    const message = isChunk
      ? 'A newer version of NinerLog is available. Reload to continue.'
      : 'The app hit an unexpected error. Reloading usually fixes it.';

    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-900">
        <div
          role="alert"
          className="card max-w-md w-full text-center py-10"
        >
          <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {message}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={this.handleReload} className="btn-primary">
              Reload
            </button>
            <button onClick={this.handleGoHome} className="btn-ghost">
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
