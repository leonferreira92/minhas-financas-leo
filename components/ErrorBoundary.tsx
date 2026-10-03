import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 sm:p-8 rounded-[2rem] bg-zinc-950 border border-red-900/40 text-center max-w-md mx-auto my-12 space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">Não foi possível carregar os dados deste show</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Ocorreu uma inconsistência ao processar as informações do Módulo de Shows ou Custos. Seus dados estão salvos e seguros.
            </p>
          </div>

          {this.state.error?.message && (
            <div className="p-3 bg-red-950/20 border border-red-900/20 rounded-xl text-left">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Código do Erro:</span>
              <span className="text-[11px] font-medium text-zinc-300 block font-mono truncate">{this.state.error.message}</span>
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1.5 shadow-md shadow-purple-600/25"
          >
            <RefreshCw size={14} />
            <span>Recarregar Módulo</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
