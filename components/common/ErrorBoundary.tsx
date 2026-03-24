import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-50" style={{fontFamily: "'Prompt', sans-serif"}}>
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-gray-100">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">ขออภัย เกิดข้อผิดพลาด</h1>
            <p className="text-gray-500 text-sm mb-6">ระบบขัดข้องชั่วคราว หรือการเชื่อมต่ออินเทอร์เน็ตของท่านมีปัญหา</p>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl shadow-lg font-bold hover:shadow-orange-500/30 transition-all active:scale-95"
            >
              รีโหลดหน้าเว็บ
            </button>
            
            {this.state.error && (
                <details className="mt-6 text-left">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">รายละเอียดทางเทคนิค</summary>
                    <p className="text-[10px] text-gray-400 mt-2 font-mono bg-gray-100 p-2 rounded break-all">
                        {this.state.error.toString()}
                    </p>
                </details>
            )}
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;