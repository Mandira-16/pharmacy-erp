'use client'

import { useEffect, useState, createContext, useContext, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const colors: Record<ToastType, { bg: string; border: string; color: string }> = {
  success: { bg: 'var(--success-bg)', border: 'var(--success-border)', color: 'var(--success)' },
  error: { bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger)' },
  warning: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', color: 'var(--warning)' },
  info: { bg: 'var(--info-bg)', border: 'var(--info-border)', color: 'var(--info)' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const c = colors[toast.type]

  useEffect(() => {
    setTimeout(() => setVisible(true), 10)
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onRemove(toast.id), 300)
    }, 3500)
    return () => clearTimeout(timer)
  }, [toast.id, onRemove])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '12px 16px', background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
      minWidth: '280px', maxWidth: '400px',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '50%',
        background: c.color, color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: '700', flexShrink: 0,
      }}>
        {icons[toast.type]}
      </div>
      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', flex: 1, lineHeight: '1.4' }}>
        {toast.message}
      </span>
      <button onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }}
        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 0 0 4px', flexShrink: 0 }}>
        ×
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}