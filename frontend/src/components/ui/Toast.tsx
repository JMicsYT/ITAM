import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastMessage, ToastType } from '../../types';

// ============================================================
// Toast notification system — Cyberpunk HUD style
// ============================================================

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const toastConfig: Record<ToastType, { icon: React.ReactNode; color: string; glowColor: string }> = {
  success: {
    icon: <CheckCircle className="w-4 h-4 shrink-0" style={{ color: '#00ff88', filter: 'drop-shadow(0 0 4px #00ff88)' }} />,
    color: '#00ff88',
    glowColor: 'rgba(0,255,136,0.15)',
  },
  error: {
    icon: <XCircle className="w-4 h-4 shrink-0" style={{ color: '#ff2255', filter: 'drop-shadow(0 0 4px #ff2255)' }} />,
    color: '#ff2255',
    glowColor: 'rgba(255,34,85,0.15)',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#ffaa00', filter: 'drop-shadow(0 0 4px #ffaa00)' }} />,
    color: '#ffaa00',
    glowColor: 'rgba(255,170,0,0.15)',
  },
  info: {
    icon: <Info className="w-4 h-4 shrink-0" style={{ color: '#00f5ff', filter: 'drop-shadow(0 0 4px #00f5ff)' }} />,
    color: '#00f5ff',
    glowColor: 'rgba(0,245,255,0.15)',
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<(ToastMessage & { exiting?: boolean })[]>([]);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const cfg = toastConfig[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 pointer-events-auto ${t.exiting ? 'toast-exit' : 'toast-enter'}`}
              style={{
                background: 'var(--color-surface)',
                border: `1px solid ${cfg.color}44`,
                borderLeft: `2px solid ${cfg.color}`,
                clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                boxShadow: `0 0 20px ${cfg.glowColor}, 0 4px 20px rgba(0,0,0,0.6)`,
              }}
            >
              {cfg.icon}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: '#e8eaff', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {t.title}
                </p>
                {t.message && (
                  <p
                    className="text-xs mt-0.5 leading-relaxed"
                    style={{ color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {t.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-1 shrink-0 transition-colors"
                aria-label="Закрыть"
                style={{ color: '#555577' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = cfg.color; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#555577'; }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
