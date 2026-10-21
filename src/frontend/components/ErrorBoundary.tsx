import React from 'react';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TOOLSMITH EDITOR: 未処理のエラーです。', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] w-full items-center justify-center p-6" role="alert">
          <section className="w-full max-w-md rounded-xl border border-primary/40 bg-black/50 p-8 text-center shadow-[0_0_40px_color-mix(in_srgb,var(--color-primary)_20%,transparent)]">
            <p className="font-orbitron text-xs tracking-[0.18em] text-primary">TOOLSMITH EDITOR</p>
            <h2 className="mt-4 text-xl font-semibold text-foreground">
              {this.props.fallbackTitle ?? 'エラーが発生しました'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-foreground/65">
              {this.props.fallbackMessage ??
                'エディタの内部で問題が発生し、表示を続けられませんでした。画面を再読み込みしてください。'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded bg-primary px-5 py-2.5 font-semibold text-background transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                再読み込み
              </button>
            </div>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
