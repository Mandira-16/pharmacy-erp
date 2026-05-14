'use client'

import Sidebar from './Sidebar'
import { ToastProvider } from './Toast'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ToastProvider>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </ToastProvider>
    </TooltipProvider>
  )
}