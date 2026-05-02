'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

interface AlertMeta {
  surplusUnits?: number
  daysToExpiry?: number
  suggestedDiscount?: number
  predictedDemand90?: number
  potentialLossLKR?: number
  currentStock?: number
  predictedDemand30?: number
  deficit?: number
  reorderQty?: number
  leadTimeDays?: number
}

interface Alert {
  id: string
  alertType: 'EXPIRY_LIQUIDATION' | 'STOCKOUT_RISK'
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  message: string
  metadata: string | null
  createdAt: string
  medicine: { name: string; category: string; unitPrice: string; sku: string }
}

interface DSSResult {
  medicine: string
  currentStock: number
  daysToExpiry: number
  unitPrice: number
  predictions: { day30: number; day60: number; day90: number }
  revenueProjection: { day30: number; day90: number }
  action: string
  confidence: number
}

interface Summary { total: number; expiry: number; stockout: number; critical: number; high: number }
interface RunSummary { totalMedicinesAnalysed: number; expiryAlerts: number; stockoutAlerts: number; totalAlertsGenerated: number }

function parseMeta(raw: string | null): AlertMeta {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function formatLKR(n: number) {
  return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n)
}

const navItems = [
  { icon: '▦', label: 'Dashboard', path: '/dashboard' },
  { icon: '⊞', label: 'Point of Sale', path: '/pos' },
  { icon: '◈', label: 'Inventory', path: '/inventory' },
  { icon: '♡', label: 'Patient History', path: '/patients' },
  { icon: '◎', label: 'Suppliers', path: '/suppliers' },
  { icon: '△', label: 'Alerts', path: '/alerts' },
  { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
  { icon: '⚡', label: 'DSS', path: '/dss', active: true },
  { icon: '≈', label: 'Analytics', path: '/analytics' },
  { icon: '☰', label: 'Reports', path: '/reports' },
]

export default function DSSPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, expiry: 0, stockout: 0, critical: 0, high: 0 })
  const [results, setResults] = useState<DSSResult[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [running, setRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'expiry' | 'stockout'>('all')
  const [lastRunTime, setLastRunTime] = useState<string | null>(null)
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true)
    setError(null)
    try {
      const res = await fetch('/api/dss/alerts')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAlerts(data.alerts ?? [])
      setSummary(data.summary ?? { total: 0, expiry: 0, stockout: 0, critical: 0, high: 0 })
    } catch (e: any) { setError(e.message) }
    finally { setLoadingAlerts(false) }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const runDSSEngine = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/dss/run', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRunSummary(data.summary)
      setResults(data.results ?? [])
      setLastRunTime(new Date().toLocaleTimeString('en-LK'))
      await fetchAlerts()
    } catch (e: any) { setError(e.message) }
    finally { setRunning(false) }
  }

  const resolveAlert = async (id: string) => {
    try {
      await fetch('/api/dss/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: id }),
      })
      setAlerts(prev => prev.filter(a => a.id !== id))
      setSummary(prev => ({ ...prev, total: prev.total - 1 }))
    } catch (e: any) { setError(e.message) }
  }

  const filteredAlerts = alerts.filter(a => {
    if (activeTab === 'expiry') return a.alertType === 'EXPIRY_LIQUIDATION'
    if (activeTab === 'stockout') return a.alertType === 'STOCKOUT_RISK'
    return true
  })

  const total30 = results.reduce((s, r) => s + r.revenueProjection.day30, 0)
  const total90 = results.reduce((s, r) => s + r.revenueProjection.day90, 0)
  const topMeds = [...results].sort((a, b) => b.revenueProjection.day30 - a.revenueProjection.day30).slice(0, 5)
  const maxRev = topMeds[0]?.revenueProjection.day30 ?? 1

  const sevColor = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6' }
  const sevBg = { CRITICAL: 'rgba(239,68,68,0.08)', HIGH: 'rgba(245,158,11,0.08)', MEDIUM: 'rgba(59,130,246,0.08)' }
  const sevBorder = { CRITICAL: 'rgba(239,68,68,0.2)', HIGH: 'rgba(245,158,11,0.2)', MEDIUM: 'rgba(59,130,246,0.2)' }

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'DM Sans, sans-serif' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', color: 'white' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '220px', background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
            }}>+</div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>SmartERP</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '4px 0 0 0', letterSpacing: '1px' }}>PHARMACY</p>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {navItems.map((item) => (
            <div
              key={item.label}
              onClick={() => router.push(item.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                cursor: 'pointer',
                background: item.active ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: item.active ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                fontSize: '13px', fontWeight: item.active ? '600' : '400',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{session?.user?.name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{(session?.user as any)?.role}</div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              width: '100%', padding: '7px', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px',
              color: '#f87171', cursor: 'pointer', fontSize: '12px',
            }}
          >Sign Out</button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Decision Support System</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
              AI-prescriptive alerts — FR11 Revenue Forecast · FR12 Expiry Liquidation · FR13 Stockout Prevention
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            {lastRunTime && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                Last run: {lastRunTime}
              </span>
            )}
            <button
              onClick={runDSSEngine}
              disabled={running}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: running ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: 'none', borderRadius: '10px', color: 'white',
                padding: '10px 22px', fontSize: '13px', fontWeight: '600',
                cursor: running ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(59,130,246,0.25)',
              }}
            >
              {running ? (
                <>
                  <span style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Analysing...
                </>
              ) : <>⚡ Run DSS Engine</>}
            </button>
          </div>
        </div>

        {/* Run summary badges */}
        {runSummary && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
            {[
              { label: `✓ ${runSummary.totalMedicinesAnalysed} medicines analysed`, color: '#3b82f6' },
              { label: `⏳ ${runSummary.expiryAlerts} expiry alerts`, color: '#f59e0b' },
              { label: `🚨 ${runSummary.stockoutAlerts} stockout alerts`, color: '#ef4444' },
            ].map(b => (
              <span key={b.label} style={{
                fontSize: '12px', padding: '5px 12px', borderRadius: '20px',
                background: `${b.color}15`, border: `1px solid ${b.color}30`, color: b.color,
              }}>{b.label}</span>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
            color: '#f87171', fontSize: '13px',
          }}>⚠ {error}</div>
        )}

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'ACTIVE ALERTS', value: summary.total, icon: '△', color: '#3b82f6' },
            { label: 'CRITICAL', value: summary.critical, icon: '🔴', color: '#ef4444' },
            { label: 'EXPIRY RISKS', value: summary.expiry, icon: '⏳', color: '#f59e0b' },
            { label: 'STOCKOUT RISKS', value: summary.stockout, icon: '🚨', color: '#8b5cf6' },
          ].map(k => (
            <div key={k.label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>{k.label}</span>
                <span style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: `${k.color}20`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '14px', color: k.color,
                }}>{k.icon}</span>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>

          {/* Left: Alerts */}
          <div>
            {/* Tabs */}
            <div style={{
              display: 'flex', gap: '4px', marginBottom: '16px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px', padding: '4px', width: 'fit-content',
            }}>
              {([
                { key: 'all', label: `All (${alerts.length})` },
                { key: 'expiry', label: `⏳ Expiry (${summary.expiry})` },
                { key: 'stockout', label: `🚨 Stockout (${summary.stockout})` },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '6px 16px', borderRadius: '7px', border: 'none',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    background: activeTab === t.key ? 'rgba(59,130,246,0.2)' : 'transparent',
                    color: activeTab === t.key ? '#60a5fa' : 'rgba(255,255,255,0.35)',
                    transition: 'all 0.15s',
                  }}
                >{t.label}</button>
              ))}
            </div>

            {/* Alert list */}
            {loadingAlerts ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                Loading alerts...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '14px',
                color: 'rgba(255,255,255,0.2)',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                <div style={{ fontWeight: '600', marginBottom: '6px', color: 'rgba(255,255,255,0.35)' }}>No active alerts</div>
                <div style={{ fontSize: '12px' }}>
                  {alerts.length === 0 ? 'Click Run DSS Engine to analyse inventory.' : 'No alerts in this category.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredAlerts.map(alert => {
                  const meta = parseMeta(alert.metadata)
                  const isExpiry = alert.alertType === 'EXPIRY_LIQUIDATION'
                  const chips = isExpiry ? [
                    { label: 'Surplus Units', value: String(meta.surplusUnits ?? 0), accent: true },
                    { label: 'Days to Expiry', value: String(meta.daysToExpiry ?? 0), accent: (meta.daysToExpiry ?? 0) < 30 },
                    { label: 'Discount', value: `${meta.suggestedDiscount ?? 0}%`, accent: true },
                    { label: 'Demand 90d', value: String(meta.predictedDemand90 ?? 0), accent: false },
                    { label: 'Loss Avoided', value: formatLKR(meta.potentialLossLKR ?? 0), accent: true },
                  ] : [
                    { label: 'Current Stock', value: String(meta.currentStock ?? 0), accent: (meta.currentStock ?? 0) === 0 },
                    { label: 'Demand 30d', value: String(meta.predictedDemand30 ?? 0), accent: true },
                    { label: 'Deficit', value: String(meta.deficit ?? 0), accent: true },
                    { label: 'Reorder Qty', value: String(meta.reorderQty ?? 0), accent: true },
                    { label: 'Lead Time', value: `${meta.leadTimeDays ?? 7}d`, accent: false },
                  ]
                  return (
                    <div key={alert.id} style={{
                      background: sevBg[alert.severity],
                      border: `1px solid ${sevBorder[alert.severity]}`,
                      borderRadius: '14px', padding: '18px 20px',
                      borderLeft: `3px solid ${sevColor[alert.severity]}`,
                      position: 'relative',
                    }}>
                      {/* Pulsing dot */}
                      <div style={{
                        position: 'absolute', top: '16px', right: '16px',
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: sevColor[alert.severity],
                        boxShadow: `0 0 0 3px ${sevColor[alert.severity]}30`,
                        animation: alert.severity === 'CRITICAL' ? 'pulse 2s infinite' : 'none',
                      }} />

                      {/* Top row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: '700', padding: '3px 10px',
                          borderRadius: '20px', letterSpacing: '0.5px',
                          background: `${sevColor[alert.severity]}20`,
                          color: sevColor[alert.severity],
                          border: `1px solid ${sevColor[alert.severity]}30`,
                        }}>{alert.severity}</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                          {isExpiry ? 'EXPIRY LIQUIDATION · FR12' : 'STOCKOUT RISK · FR13'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                          {alert.medicine.category} · {alert.medicine.sku}
                        </span>
                      </div>

                      {/* Message */}
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.6', margin: '0 0 14px 0' }}>
                        {alert.message}
                      </p>

                      {/* Chips */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '14px' }}>
                        {chips.map(chip => (
                          <div key={chip.label} style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px', padding: '8px 10px',
                          }}>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{chip.label}</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: chip.accent ? '#f59e0b' : 'rgba(255,255,255,0.7)' }}>{chip.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Resolve */}
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        style={{
                          fontSize: '12px', color: 'rgba(255,255,255,0.3)',
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '6px', padding: '6px 14px', cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.color = '#10b981'
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(16,185,129,0.3)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'
                          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'
                        }}
                      >✓ Mark as Resolved</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Revenue + FR cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Revenue Forecast */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px', padding: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Revenue Forecast</h3>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)',
                }}>FR11</span>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>XGBoost predicted units × unit price</p>

              {results.length > 0 ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                    {[
                      { label: '30-Day', value: formatLKR(total30), color: '#10b981' },
                      { label: '90-Day', value: formatLKR(total90), color: '#34d399' },
                    ].map(t => (
                      <div key={t.label} style={{
                        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)',
                        borderRadius: '10px', padding: '12px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>{t.label}</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: t.color }}>{t.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {topMeds.map(r => (
                      <div key={r.medicine} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', width: '80px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.medicine}</span>
                        <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(r.revenueProjection.day30 / maxRev) * 100}%`, background: 'linear-gradient(90deg, #065f46, #10b981)', borderRadius: '3px', transition: 'width 1s ease' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#10b981', width: '70px', textAlign: 'right', flexShrink: 0, fontFamily: 'monospace' }}>{formatLKR(r.revenueProjection.day30)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>
                  Run DSS Engine to see projections
                </div>
              )}
            </div>

            {/* FR info cards */}
            {[
              { tag: 'FR11', name: 'Sales Forecasting', desc: 'Projects LKR revenue by multiplying XGBoost predicted units × unit price for each medicine over 30 and 90 day horizons.', color: '#10b981' },
              { tag: 'FR12', name: 'Expiry Liquidation', desc: 'Detects surplus stock facing expiry within 90 days. Recommends clearance discounts to recover capital instead of writing off stock.', color: '#f59e0b' },
              { tag: 'FR13', name: 'Stockout Prevention', desc: 'Calculates reorder quantities with a 7-day lead time safety buffer when 30-day predicted demand exceeds current stock.', color: '#ef4444' },
            ].map(f => (
              <div key={f.tag} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', padding: '16px 18px',
                borderLeft: `3px solid ${f.color}40`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: f.color, fontFamily: 'monospace' }}>{f.tag}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>{f.name}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0, lineHeight: '1.6' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,0.3)} 50%{box-shadow:0 0 0 6px rgba(239,68,68,0)} }
      `}</style>
    </div>
  )
}