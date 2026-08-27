// @ts-nocheck — React 19 class component types vs useDefineForClassFields
import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Mailoo] Uncaught UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-[#27272A] bg-[#0F0F12] rounded-xl p-8 space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Something went wrong</h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            The webmail client hit an unexpected error. Your mail is safe. Reload to restore the session.
          </p>
          <p className="text-[11px] font-mono-code text-[#71717A] break-all">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-white text-black"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload Mailoo
          </button>
        </div>
      </div>
    );
  }
}
