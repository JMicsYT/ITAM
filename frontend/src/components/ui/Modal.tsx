import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

// ============================================================
// Modal dialog — Cyberpunk HUD panel style
// ============================================================

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    firstFocusRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{
          background: 'rgba(0,0,0,0.75)',
          animation: 'var(--animate-fade-in)',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={clsx(
          'relative w-full flex flex-col max-h-[92dvh] sm:max-h-[85vh]',
          'rounded-t-none sm:rounded-none',
          sizeClasses[size]
        )}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
          boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 40px rgba(0,245,255,0.05)',
          animation: 'var(--animate-slide-up)',
        }}
      >
        {/* Top neon corner decoration */}
        <div
          className="absolute top-0 right-0 w-5 h-5 pointer-events-none"
          style={{
            borderTop: '1px solid #00f5ff',
            borderRight: '1px solid #00f5ff',
            boxShadow: '2px -2px 8px #00f5ff44',
          }}
        />
        {/* Bottom left decoration */}
        <div
          className="absolute bottom-0 left-0 w-5 h-5 pointer-events-none"
          style={{
            borderBottom: '1px solid #00f5ff',
            borderLeft: '1px solid #00f5ff',
            boxShadow: '-2px 2px 8px #00f5ff44',
          }}
        />

        {/* Top accent line */}
        <div
          className="h-[1px] w-full shrink-0"
          style={{ background: 'linear-gradient(90deg, #00f5ff44, transparent)' }}
        />

        {/* Mobile drag handle */}
        <div className="flex sm:hidden justify-center pt-3 pb-1">
          <div className="w-10 h-[2px] rounded-full" style={{ background: '#00f5ff33' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h2
              className="text-base font-bold uppercase tracking-widest"
              style={{
                fontFamily: 'Orbitron, monospace',
                color: '#e8eaff',
              }}
            >
              {title}
            </h2>
            {description && (
              <p
                className="text-xs mt-1 uppercase tracking-wider"
                style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            className="p-1.5 ml-4 shrink-0 transition-all duration-200"
            aria-label="Закрыть"
            style={{ color: '#555577', border: '1px solid var(--color-border)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff2255';
              e.currentTarget.style.borderColor = '#ff225544';
              e.currentTarget.style.background = 'rgba(255,34,85,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#555577';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
