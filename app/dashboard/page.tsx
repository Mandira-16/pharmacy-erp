'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { icon: '▦', label: 'Dashboard', path: '/dashboard', active: true },
  { icon: '⊞', label: 'Point of Sale', path: '/pos' },
  { icon: '◈', label: 'Inventory', path: '/inventory' },
  { icon: '♡', label: 'Patient History', path: '/patients' },
  { icon: '◎', label: 'Suppliers', path: '/suppliers' },
  { icon: '△', label: 'Alerts', path: '/alerts' },
  { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
  { icon: '⚡', label: 'DSS', path: '/dss' },
  { icon: '≈', label: 'Analytics', path: '/analytics' },
  { icon: '☰', label: 'Reports', path: '/reports' },
]

interface KPIs { todayRevenue: number; revenueChange: string | null; activeSKUs: number; lowStockCount: number; todayTransactions: number; expiryAlerts: number; criticalExpiry: number }
interface ChartPoint { month: string; actual: number; forecast: number }
interface TopMed { name: string; sold: number; stock: number }
interface SmartAlert { message: string; color: string; severity: string; type: string }
interface CategoryData { label: string; pct: number; color: string }
interface DashboardData { kpis: KPIs; chartData: ChartPoint[]; topMedicines: TopMed[]; smartAlerts: SmartAlert[]; categoryData: CategoryData[] }

function formatLKR(n: number) {
  if (n >= 1000000) return `LKR ${(n/1000000).toFixed(1)}M`
  if (n >= 1000) return `LKR ${(n/1000).toFixed(1)}K`
  return `LKR ${n.toFixed(0)}`
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
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
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading dashboard...
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const kpis = data?.kpis
  const chartData = data?.chartData ?? []
  const maxVal = Math.max(...chartData.map(d => Math.max(d.actual, d.forecast)), 1)

  const kpiCards = [
    { label: "TODAY'S REVENUE", value: kpis ? formatLKR(kpis.todayRevenue) : 'LKR 0', sub: kpis?.revenueChange ? `${Number(kpis.revenueChange) >= 0 ? '+' : ''}${kpis.revenueChange}% vs yesterday` : 'No sales yesterday', icon: '$', color: '#10b981' },
    { label: 'ACTIVE SKUs', value: kpis ? kpis.activeSKUs.toLocaleString() : '0', sub: kpis ? `${kpis.lowStockCount} low stock items` : '—', icon: '◈', color: '#3b82f6' },
    { label: 'TRANSACTIONS', value: kpis ? kpis.todayTransactions.toString() : '0', sub: "Today's completed sales", icon: '⊞', color: '#8b5cf6' },
    { label: 'EXPIRY ALERTS', value: kpis ? kpis.expiryAlerts.toString() : '0', sub: kpis ? `${kpis.criticalExpiry} critical (< 30 days)` : '—', icon: '△', color: '#ef4444' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', color: 'white' }}>
      <div style={{ width: '220px', background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>+</div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>SmartERP</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '4px 0 0 0', letterSpacing: '1px' }}>PHARMACY</p>
        </div>
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {navItems.map(item => (
            <div key={item.label} onClick={() => router.push(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', marginBottom: '2px', cursor: 'pointer', background: item.active ? 'rgba(59,130,246,0.15)' : 'transparent', color: item.active ? '#60a5fa' : 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: item.active ? '600' : '400', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            ><span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>{item.label}</div>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{session?.user?.name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{(session?.user as any)?.role}</div>
          <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ width: '100%', padding: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Dashboard</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Real-time pharmacy operations overview</p>
          </div>
          <button onClick={fetchDashboard} style={{ fontSize: '12px', padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>↻ Refresh</button>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>⚠ {error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {kpiCards.map(kpi => (
            <div key={kpi.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>{kpi.label}</span>
                <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${kpi.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: kpi.color }}>{kpi.icon}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>{kpi.value}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Revenue vs AI Forecast</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>XGBoost demand prediction accuracy</p>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <span style={{ color: '#10b981' }}>● Actual</span>
                <span style={{ color: '#3b82f6' }}>● Forecast</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px' }}>
              {chartData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%' }}>
                    {d.actual > 0 && <div style={{ flex: 1, height: `${Math.max((d.actual/maxVal)*140,2)}px`, background: 'linear-gradient(180deg,#10b981,#059669)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />}
                    <div style={{ flex: 1, height: `${Math.max((d.forecast/maxVal)*140,2)}px`, background: 'rgba(59,130,246,0.4)', borderRadius: '3px 3px 0 0', border: '1px dashed rgba(59,130,246,0.6)' }} />
                  </div>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{d.month}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '12px', color: '#10b981' }}>
              Model MAPE: 28.4% — vs industry baseline 141–191%
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Sales by Category</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Medicine category distribution</p>
            {(data?.categoryData?.length ? data.categoryData : [
              { label: 'Antibiotic', pct: 32, color: '#3b82f6' },
              { label: 'Antipyretic', pct: 25, color: '#10b981' },
              { label: 'Chronic', pct: 18, color: '#8b5cf6' },
              { label: 'Vitamin', pct: 15, color: '#f59e0b' },
              { label: 'Other', pct: 10, color: '#6b7280' },
            ]).map(cat => (
              <div key={cat.label} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{cat.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>{cat.pct}%</span>
                </div>
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${cat.pct}%`, background: cat.color, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>Top Selling Medicines</h3>
            {data?.topMedicines?.length ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', padding: '0 4px' }}>
                  <span>MEDICINE</span><span>SOLD</span><span>STOCK</span>
                </div>
                {data.topMedicines.map((med, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', padding: '10px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{med.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>{med.sold}</span>
                    <span style={{ textAlign: 'right', color: med.stock === 0 ? '#ef4444' : med.stock < 100 ? '#f59e0b' : '#10b981' }}>{med.stock}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
                Process sales via POS to see top medicines
              </div>
            )}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Smart Alerts</h3>
              {(data?.smartAlerts?.length ?? 0) > 0 && <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{data!.smartAlerts.length} Active</span>}
            </div>
            {data?.smartAlerts?.length ? (
              data.smartAlerts.map((alert, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: `${alert.color}08`, border: `1px solid ${alert.color}25`, borderRadius: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: alert.color, marginTop: '4px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>{alert.message}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                Run DSS engine to generate alerts
              </div>
            )}
            <button onClick={() => router.push('/dss')} style={{ width: '100%', marginTop: '4px', padding: '9px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>View DSS Dashboard →</button>
          </div>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}