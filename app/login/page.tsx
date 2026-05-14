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
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          display: flex;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* Left panel */
        .left-panel {
          width: 45%;
          background: linear-gradient(145deg, #0f172a 0%, #1e3a6e 50%, #0f2a5c 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }

        .left-panel::before {
          content: '';
          position: absolute;
          top: -120px; right: -120px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%);
          pointer-events: none;
        }

        .left-panel::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -80px;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .left-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .left-logo-icon {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 800; color: white;
          box-shadow: 0 4px 16px rgba(37,99,235,0.4);
        }

        .left-logo-text {
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }

        .left-logo-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 500;
        }

        .left-hero {
          position: relative;
          z-index: 1;
        }

        .left-tagline {
          font-size: 38px;
          font-weight: 800;
          color: white;
          line-height: 1.15;
          letter-spacing: -1px;
          margin-bottom: 20px;
        }

        .left-tagline span {
          background: linear-gradient(135deg, #60a5fa, #38bdf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .left-desc {
          font-size: 14px;
          color: rgba(255,255,255,0.55);
          line-height: 1.7;
          max-width: 360px;
          margin-bottom: 36px;
        }

        .left-stats {
          display: flex;
          gap: 32px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-num {
          font-size: 26px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }

        .stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 500;
        }

        .left-footer {
          position: relative;
          z-index: 1;
          font-size: 12px;
          color: rgba(255,255,255,0.25);
        }

        /* Decorative grid dots */
        .grid-dots {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          z-index: 0;
        }

        /* Right panel */
        .right-panel {
          flex: 1;
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px;
        }

        .login-box {
          width: 100%;
          max-width: 400px;
        }

        .login-heading {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .login-subheading {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 36px;
        }

        .form-group {
          margin-bottom: 18px;
        }

        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 7px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: white;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          color: #0f172a;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }

        .form-input::placeholder { color: #94a3b8; }

        .error-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          font-size: 13px;
          margin-bottom: 18px;
        }

        .login-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Plus Jakarta Sans', sans-serif;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 14px rgba(37,99,235,0.35);
          letter-spacing: 0.2px;
          margin-top: 8px;
        }

        .login-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          box-shadow: 0 6px 20px rgba(37,99,235,0.4);
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 20px;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .divider-text {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .demo-creds {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px 16px;
        }

        .demo-creds-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }

        .demo-cred-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: all 0.1s;
          border-radius: 4px;
        }

        .demo-cred-row:last-child { border-bottom: none; }

        .demo-cred-row:hover { background: #f8fafc; padding-left: 6px; }

        .demo-role {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .demo-email {
          font-size: 11px;
          color: #2563eb;
          font-family: 'JetBrains Mono', monospace;
        }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
          vertical-align: middle;
          margin-right: 6px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .left-panel { display: none; }
          .right-panel { padding: 32px 24px; }
        }
      `}</style>

      <div className="login-root">

        {/* Left panel */}
        <div className="left-panel">
          <div className="grid-dots" />

          {/* Logo */}
          <div className="left-logo">
            <div className="left-logo-icon">+</div>
            <div>
              <div className="left-logo-text">SmartERP</div>
              <div className="left-logo-sub">Pharmacy</div>
            </div>
          </div>

          {/* Hero */}
          <div className="left-hero">
            <div className="left-tagline">
              Intelligent pharmacy<br />
              management for<br />
              <span>Sri Lanka's SMEs</span>
            </div>
            <div className="left-desc">
              AI-powered demand forecasting, real-time inventory tracking, and prescriptive decision support — purpose-built for community pharmacies.
            </div>
            <div className="left-stats">
              <div className="stat-item">
                <div className="stat-num">28.4%</div>
                <div className="stat-label">Model MAPE</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">5×</div>
                <div className="stat-label">Better than baseline</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">FR11–13</div>
                <div className="stat-label">DSS Modules</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="left-footer">
            © 2026 SmartERP · BSc Software Engineering · University of Plymouth
          </div>
        </div>

        {/* Right panel — login form */}
        <div className="right-panel">
          <div className="login-box">
            <div className="login-heading">Welcome back</div>
            <div className="login-subheading">Sign in to your SmartERP account to continue</div>

            {error && (
              <div className="error-box">
                <span>⚠</span> {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@pharmacy.com"
                className="form-input"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
            </div>

            <button className="login-btn" onClick={handleLogin} disabled={loading}>
              {loading ? <><span className="spinner" />Signing in...</> : 'Sign In →'}
            </button>

            <div className="divider">
              <div className="divider-line" />
              <div className="divider-text">Demo Credentials</div>
              <div className="divider-line" />
            </div>

            <div className="demo-creds">
              <div className="demo-creds-title">Click to autofill</div>
              {[
                { role: 'Admin', email: 'admin@pharmacy.com', password: 'Admin@1234' },
                { role: 'Pharmacist', email: 'pharmacist@pharmacy.com', password: 'Pharma@1234' },
                { role: 'Owner', email: 'owner@pharmacy.com', password: 'Owner@1234' },
                { role: 'Assistant', email: 'assistant@pharmacy.com', password: 'Assistant@1234' },
              ].map(cred => (
                <div
                  key={cred.role}
                  className="demo-cred-row"
                  onClick={() => { setEmail(cred.email); setPassword(cred.password) }}
                >
                  <span className="demo-role">{cred.role}</span>
                  <span className="demo-email">{cred.email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}