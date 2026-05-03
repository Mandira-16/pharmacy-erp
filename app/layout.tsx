import type { Metadata } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '../components/SessionWrapper'
import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata: Metadata = {
  title: 'Ceylon Pharmacy — SmartERP',
  description: 'Intelligent pharmacy management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  )
}