import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('KITT AI ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleSwitchTo2D = () => {
    try {
      localStorage.setItem('kitt_view_mode', '2d');
    } catch {
      // Ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || String(this.state.error || '');
      const isWebglFault =
        errorMsg.toLowerCase().includes('webgl') ||
        errorMsg.toLowerCase().includes('three') ||
        errorMsg.toLowerCase().includes('context');

      return (
        <div className="min-h-screen w-full bg-[#0a0d13] text-slate-200 flex flex-col items-center justify-center p-6 select-none font-mono">
          <div className="max-w-md w-full bg-[#111622] border border-amber-500/30 rounded-xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center mx-auto text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-100">
                {isWebglFault ? 'WebGL 3D Context Blocked' : 'KITT Workspace Reset'}
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                {isWebglFault
                  ? 'Your browser environment blocked WebGL 3D context creation. Switch to the 2D EDA Schematic to continue without 3D GPU dependency.'
                  : 'The electronics simulation kernel encountered an unexpected runtime fault.'}
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-[#080b10] border border-[#1e2533] rounded text-left text-[11px] text-red-400 overflow-x-auto">
                <code>{this.state.error.message || String(this.state.error)}</code>
              </div>
            )}
            <div className="space-y-2">
              {isWebglFault && (
                <button
                  onClick={this.handleSwitchTo2D}
                  className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-violet-900/40"
                >
                  <span>Switch to 2D Schematic & Resume</span>
                </button>
              )}
              <button
                onClick={this.handleReset}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  isWebglFault
                    ? 'bg-[#1a2130] hover:bg-[#232c40] text-slate-300 hover:text-white border border-[#2b364d]'
                    : 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Restart Workspace Engine</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
