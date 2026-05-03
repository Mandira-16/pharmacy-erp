import type { Metadata } from 'next'
import './globals.css'
import { SessionProviderWrapper } from '../components/SessionWrapper'

export const metadata: Metadata = {
  title: 'SmartERP — Pharmacy Management',
  description: 'AI-powered ERP system for SME pharmacies in Sri Lanka',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}