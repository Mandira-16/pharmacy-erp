'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function RevokePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [patientName, setPatientName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Invalid revoke link — no token provided.'); return }
    fetch(`/api/patients/revoke-consent?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setPatientName(d.patientName)
        setStatus('success')
      })
      .catch(e => { setErrorMsg(e.message); setStatus('error') })
  }, [token])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '48px 40px', maxWidth: '460px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800', color: 'white' }}>+</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Ceylon Pharmacy</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Colombo · Est. 1987</div>
            </div>
          </div>

          {status === 'loading' && (
            <div>
              <div style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: '#64748b', fontSize: '14px' }}>Processing your request...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div style={{ width: '64px', height: '64px', background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px' }}>🔒</div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>Access Revoked</h1>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', marginBottom: '24px' }}>
                {patientName ? `Your` : 'The'} medication history at Ceylon Pharmacy has been <strong>locked immediately</strong>. No staff can access your records until you grant consent again.
              </p>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <p style={{ fontSize: '13px', color: '#15803d', fontWeight: '500', lineHeight: '1.6' }}>
                  ✓ Consent revoked successfully<br />
                  ✓ Records are now protected<br />
                  ✓ PDPA compliant — Ceylon Pharmacy
                </p>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                If you wish to grant access again in the future, simply visit the pharmacy and ask the pharmacist to send a new consent request to your email.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div style={{ width: '64px', height: '64px', background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px' }}>⚠️</div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>Link Invalid</h1>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.7', marginBottom: '20px' }}>{errorMsg || 'This revoke link is invalid or has already been used.'}</p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px' }}>
                <p style={{ fontSize: '12px', color: '#dc2626', lineHeight: '1.6' }}>If you need to revoke access, please visit Ceylon Pharmacy or contact us directly.</p>
              </div>
            </div>
          )}

          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>© 2026 Ceylon Pharmacy · PDPA Compliant · Colombo, Sri Lanka</p>
          </div>
        </div>
      </div>
    </>
  )
}