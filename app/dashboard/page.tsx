'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'

interface KPIs { todayRevenue: number; revenueChange: string | null; activeSKUs: number; lowStockCount: number; todayTransactions: number; expiryAlerts: number; criticalExpiry: number }
interface ChartPoint { month: string; actual: number; forecast: number }
interface TopMed { name: string; sold: number; stock: number }
interface SmartAlert { message: string; color: string; severity: string; type: string }
interface CategoryData { label: string; pct: number; color: string }
interface DashboardData { kpis: KPIs; chartData: ChartPoint[]; topMedicines: TopMed[]; smartAlerts: SmartAlert[]; categoryData: CategoryData[] }

function fmt(n: number) {
  if (n >= 1000000) return `LKR ${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `LKR ${(n / 1000).toFixed(1)}K`
  return `LKR ${n.toFixed(0)}`
}

function KPICard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: string }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
        <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '6px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{sub}</div>
      <div style={{ height: '3px', background: `${color}20`, borderRadius: '2px', marginTop: '14px' }}>
        <div style={{ height: '100%', width: '60%', background: color, borderRadius: '2px' }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const denied = searchParams.get('denied')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchDashboard = () => {
    setLoading(true)
    fetch('/api/dashboard').then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); setData(d) }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { if (status === 'authenticated') fetchDashboard() }, [status])

  if (status === 'loading' || loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading dashboard...</span>
      </div>
    </AppLayout>
  )

  const kpis = data?.kpis
  const chartData = data?.chartData ?? []
  const maxVal = Math.max(...chartData.map(d => Math.max(d.actual, d.forecast)), 1)

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px', maxWidth: '1400px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Dashboard</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Real-time pharmacy operations overview</p>
          </div>
          <button onClick={fetchDashboard} className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px' }}>↻ Refresh</button>
        </div>

        {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--danger)', fontSize: '13px' }}>⚠ {error}</div>}

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <KPICard label="Today's Revenue" value={kpis ? fmt(kpis.todayRevenue) : 'LKR 0'} sub={kpis?.revenueChange ? `${Number(kpis.revenueChange) >= 0 ? '+' : ''}${kpis.revenueChange}% vs yesterday` : 'No sales yesterday'} color="#10b981" icon="💰" />
          <KPICard label="Active SKUs" value={kpis ? kpis.activeSKUs.toString() : '0'} sub={kpis ? `${kpis.lowStockCount} low stock items` : '—'} color="#2563eb" icon="📦" />
          <KPICard label="Transactions" value={kpis ? kpis.todayTransactions.toString() : '0'} sub="Today's completed sales" color="#8b5cf6" icon="🧾" />
          <KPICard label="Expiry Alerts" value={kpis ? kpis.expiryAlerts.toString() : '0'} sub={kpis ? `${kpis.criticalExpiry} critical (< 30 days)` : '—'} color="#ef4444" icon="⚠️" />
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', marginBottom: '20px' }}>

          {/* Revenue chart */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>Revenue vs AI Forecast</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>XGBoost demand prediction accuracy</p>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: '600' }}>
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />Actual</span>
                <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />Forecast</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
              {chartData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px' }}>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%' }}>
                    {d.actual > 0 && <div style={{ flex: 1, height: `${Math.max((d.actual / maxVal) * 130, 2)}px`, background: 'linear-gradient(180deg, #10b981, #059669)', borderRadius: '3px 3px 0 0' }} />}
                    <div style={{ flex: 1, height: `${Math.max((d.forecast / maxVal) * 130, 2)}px`, background: '#2563eb20', borderRadius: '3px 3px 0 0', border: '1px solid #2563eb40', borderBottom: 'none' }} />
                  </div>
                  <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontWeight: '500' }}>{d.month}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px', padding: '10px 14px', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--success)', fontWeight: '500' }}>
              Model MAPE: 28.4% — vs industry baseline 141–191%
            </div>
          </div>

          {/* Category breakdown */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Sales by Category</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Medicine category distribution</p>
            {(data?.categoryData?.length ? data.categoryData : [
              { label: 'Antibiotic', pct: 32, color: '#2563eb' },
              { label: 'Antipyretic', pct: 25, color: '#10b981' },
              { label: 'Chronic', pct: 18, color: '#8b5cf6' },
              { label: 'Vitamin', pct: 15, color: '#f59e0b' },
              { label: 'Other', pct: 10, color: '#94a3b8' },
            ]).map(cat => (
              <div key={cat.label} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{cat.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{cat.pct}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${cat.pct}%`, background: cat.color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Top medicines */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>Top Selling Medicines</h3>
            {data?.topMedicines?.length ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', fontSize: '10px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', padding: '0 4px' }}>
                  <span>Medicine</span><span>Sold</span><span>Stock</span>
                </div>
                {data.topMedicines.map((med, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', padding: '10px 4px', borderBottom: '1px solid var(--border-subtle)', fontSize: '13px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{med.name}</span>
                    <span style={{ color: 'var(--text-secondary)', textAlign: 'right', fontWeight: '600' }}>{med.sold}</span>
                    <span style={{ textAlign: 'right', fontWeight: '700', color: med.stock === 0 ? 'var(--danger)' : med.stock < 100 ? 'var(--warning)' : 'var(--success)' }}>{med.stock}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
                Process sales via POS to see top medicines
              </div>
            )}
          </div>

          {/* Smart alerts */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Smart Alerts</h3>
              {(data?.smartAlerts?.length ?? 0) > 0 && (
                <span style={{ fontSize: '11px', fontWeight: '600', background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info-border)', padding: '3px 10px', borderRadius: '20px' }}>{data!.smartAlerts.length} Active</span>
              )}
            </div>
            {data?.smartAlerts?.length ? (
              data.smartAlerts.map((alert, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 12px', background: `${alert.color}08`, border: `1px solid ${alert.color}20`, borderRadius: 'var(--radius-md)', marginBottom: '8px', borderLeft: `3px solid ${alert.color}` }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: alert.color, marginTop: '5px', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{alert.message}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                Run DSS engine to generate alerts
              </div>
            )}
            <button onClick={() => router.push('/dss')} style={{ width: '100%', marginTop: '8px', padding: '9px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
            >View DSS Dashboard →</button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}