'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>

      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        top: '-100px',
        left: '-100px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
        bottom: '-50px',
        right: '-50px',
        pointerEvents: 'none',
      }} />

      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 1,
      }}>

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>+</div>
            <span style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: '-0.5px',
            }}>SmartERP</span>
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: '12px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginTop: '4px',
          }}>Pharmacy Management System</p>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            color: '#ffffff',
            fontSize: '24px',
            fontWeight: '600',
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px',
          }}>Welcome back</h1>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '14px',
            margin: 0,
          }}>Sign in to your account to continue</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#f87171',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            fontWeight: '500',
            letterSpacing: '0.5px',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@pharmacy.com"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            fontWeight: '500',
            letterSpacing: '0.5px',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '13px',
            background: loading
              ? 'rgba(59,130,246,0.4)'
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: 'none',
            borderRadius: '10px',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: '0.3px',
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div style={{
          marginTop: '28px',
          padding: '16px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '11px',
            margin: '0 0 6px 0',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>Demo Credentials</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '2px 0' }}>
            Admin: admin@pharmacy.com / Admin@1234
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '2px 0' }}>
            Pharmacist: pharmacist@pharmacy.com / Pharma@1234
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}