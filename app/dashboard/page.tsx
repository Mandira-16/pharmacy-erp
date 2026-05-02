'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const mockForecastData = [
  { month: 'Jan', actual: 285000, forecast: 270000 },
  { month: 'Feb', actual: 310000, forecast: 295000 },
  { month: 'Mar', actual: 298000, forecast: 310000 },
  { month: 'Apr', actual: 325000, forecast: 318000 },
  { month: 'May', actual: 340000, forecast: 335000 },
  { month: 'Jun', actual: 318000, forecast: 330000 },
  { month: 'Jul', actual: 355000, forecast: 348000 },
  { month: 'Aug', actual: 372000, forecast: 360000 },
  { month: 'Sep', actual: 348000, forecast: 365000 },
  { month: 'Oct', actual: 390000, forecast: 378000 },
  { month: 'Nov', actual: 410000, forecast: 395000 },
  { month: 'Dec', actual: 0, forecast: 425000 },
]

const topMedicines = [
  { name: 'Amoxicillin 500mg', sold: 1240, stock: 580, trend: '+12%' },
  { name: 'Paracetamol 500mg', sold: 980, stock: 1200, trend: '+8%' },
  { name: 'Metformin 850mg', sold: 756, stock: 120, trend: '-3%' },
  { name: 'Losartan 50mg', sold: 634, stock: 450, trend: '+5%' },
  { name: 'Omeprazole 20mg', sold: 521, stock: 80, trend: '+2%' },
]

const smartAlerts = [
  { type: 'expiry', message: 'Omeprazole 20mg — expires in 28 days', color: '#ef4444' },
  { type: 'stock', message: 'Metformin 850mg — below reorder point (120 units)', color: '#f59e0b' },
  { type: 'forecast', message: 'Amoxicillin demand surge predicted next 30 days', color: '#3b82f6' },
  { type: 'expiry', message: 'Ciprofloxacin 500mg — expires in 45 days', color: '#ef4444' },
]

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        Loading...
      </div>
    )
  }

  const maxVal = Math.max(...mockForecastData.map(d => Math.max(d.actual, d.forecast)))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', color: 'white' }}>

      {/* Sidebar */}
      <div style={{
        width: '220px',
        background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
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

        {/* Nav items */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {[
            { icon: '▦', label: 'Dashboard', path: '/dashboard', active: true },
            { icon: '⊞', label: 'Point of Sale', path: '/pos' },
            { icon: '◈', label: 'Inventory', path: '/inventory' },
            { icon: '♡', label: 'Patient History', path: '/patients' },
            { icon: '◎', label: 'Suppliers', path: '/suppliers' },
            { icon: '△', label: 'Alerts', path: '/alerts' },
            { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
            { icon: '≈', label: 'Analytics', path: '/analytics' },
            { icon: '☰', label: 'Reports', path: '/reports' },
          ].map((item) => (
            <div
              key={item.label}
              onClick={() => item.path === '/inventory' && router.push('/inventory')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                marginBottom: '2px',
                cursor: 'pointer',
                background: item.active ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: item.active ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                fontSize: '13px',
                fontWeight: item.active ? '600' : '400',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
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

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Real-time pharmacy operations overview</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: "TODAY'S REVENUE", value: 'LKR 124,500', sub: '+12.5% vs yesterday', icon: '$', color: '#10b981' },
            { label: 'ACTIVE SKUs', value: '2,847', sub: '23 low stock items', icon: '◈', color: '#3b82f6' },
            { label: 'TRANSACTIONS', value: '156', sub: '+6.5% vs avg', icon: '⊞', color: '#8b5cf6' },
            { label: 'EXPIRY ALERTS', value: '18', sub: '7 critical (< 30 days)', icon: '△', color: '#ef4444' },
          ].map((kpi) => (
            <div key={kpi.label} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>{kpi.label}</span>
                <span style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: `${kpi.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', color: kpi.color,
                }}>{kpi.icon}</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>{kpi.value}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', marginBottom: '24px' }}>

          {/* Revenue vs Forecast Chart */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Revenue vs AI Forecast</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>XGBoost demand prediction accuracy</p>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <span style={{ color: '#10b981' }}>● Actual</span>
                <span style={{ color: '#3b82f6', borderStyle: 'dashed' }}>● Forecast</span>
              </div>
            </div>

            {/* Simple bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px' }}>
              {mockForecastData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%' }}>
                    {d.actual > 0 && (
                      <div style={{
                        flex: 1,
                        height: `${(d.actual / maxVal) * 140}px`,
                        background: 'linear-gradient(180deg, #10b981, #059669)',
                        borderRadius: '3px 3px 0 0',
                        opacity: 0.8,
                      }} />
                    )}
                    <div style={{
                      flex: 1,
                      height: `${(d.forecast / maxVal) * 140}px`,
                      background: 'rgba(59,130,246,0.4)',
                      borderRadius: '3px 3px 0 0',
                      border: '1px dashed rgba(59,130,246,0.6)',
                    }} />
                  </div>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{d.month}</span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#10b981',
            }}>
              Model MAPE: 28.4% — vs industry baseline 141–191%
            </div>
          </div>

          {/* Sales by Category */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '24px',
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Sales by Category</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Medicine category distribution</p>

            {[
              { label: 'Antibiotics', pct: 32, color: '#3b82f6' },
              { label: 'Analgesics', pct: 25, color: '#10b981' },
              { label: 'Cardiovascular', pct: 18, color: '#8b5cf6' },
              { label: 'Respiratory', pct: 15, color: '#f59e0b' },
              { label: 'Other', pct: 10, color: '#6b7280' },
            ].map((cat) => (
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

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Top Selling Medicines */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '24px',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>Top Selling Medicines</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', padding: '0 4px' }}>
              <span>MEDICINE</span><span>SOLD</span><span>STOCK</span><span>TREND</span>
            </div>
            {topMedicines.map((med, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: '8px',
                padding: '10px 4px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                fontSize: '13px',
                alignItems: 'center',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{med.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>{med.sold}</span>
                <span style={{
                  textAlign: 'right',
                  color: med.stock < 200 ? '#ef4444' : med.stock < 400 ? '#f59e0b' : '#10b981',
                }}>{med.stock}</span>
                <span style={{
                  textAlign: 'right',
                  color: med.trend.startsWith('+') ? '#10b981' : '#ef4444',
                  fontSize: '12px',
                }}>{med.trend}</span>
              </div>
            ))}
          </div>

          {/* Smart Alerts */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Smart Alerts</h3>
              <span style={{
                background: 'rgba(59,130,246,0.15)',
                color: '#60a5fa',
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '20px',
              }}>4 Active</span>
            </div>
            {smartAlerts.map((alert, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                background: `${alert.color}08`,
                border: `1px solid ${alert.color}25`,
                borderRadius: '10px',
                marginBottom: '10px',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: alert.color, marginTop: '4px', flexShrink: 0,
                }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>{alert.message}</span>
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
      `}</style>
    </div>
  )
}