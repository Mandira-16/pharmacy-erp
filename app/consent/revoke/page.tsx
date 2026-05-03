import { Suspense } from 'react'
import RevokeContent from './RevokeContent'

export default function RevokePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b' }}>Processing...</p>
        </div>
      </div>
    }>
      <RevokeContent />
    </Suspense>
  )
}