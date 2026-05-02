import { SessionProviderWrapper } from '../components/SessionWrapper'

export const metadata = {
  title: 'SmartERP - Pharmacy Management',
  description: 'AI-powered ERP system for SME pharmacies',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  )
}