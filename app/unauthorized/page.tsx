'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role ?? 'your role'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xl)', padding: '48px 40px', maxWidth: '460px', width: '100%', boxShadow: 'var(--shadow-xl)', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px' }}>🚫</div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>Access Denied</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '24px' }}>
          You do not have permission to access this page. Your current role (<strong>{role}</strong>) does not have access to this module.
        </p>
        <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '24px', fontSize: '12px', color: 'var(--info)', lineHeight: '1.6' }}>
          If you believe this is an error, please contact your system administrator.
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ padding: '11px 28px', background: 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}