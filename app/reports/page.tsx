'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { icon: '▦', label: 'Dashboard', path: '/dashboard' },
  { icon: '⊞', label: 'Point of Sale', path: '/pos' },
  { icon: '◈', label: 'Inventory', path: '/inventory' },
  { icon: '♡', label: 'Patient History', path: '/patients' },
  { icon: '◎', label: 'Suppliers', path: '/suppliers' },
  { icon: '△', label: 'Alerts', path: '/alerts' },
  { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
  { icon: '⚡', label: 'DSS', path: '/dss' },
  { icon: '≈', label: 'Analytics', path: '/analytics' },
  { icon: '☰', label: 'Reports', path: '/reports', active: true },
]

interface Summary {
  totalRevenue: number; prevRevenue: number; revenueChange: string | null
  totalTransactions: number; avgSaleValue: number; prevTransactions: number
}
interface PaymentBreakdown { [key: string]: { count: number; amount: number } }
interface DailyRevenue { date: string; amount: number }
interface MedPerformance { id: string; name: string; category: string; qty: number; revenue: number }
interface CategoryRevenue { category: string; revenue: number }
interface InventorySummary {
  totalSKUs: number; inStock: number; lowStock: number; outOfStock: number
  expiringIn30: number; expiringIn90: number; totalStockValue: number
}
interface Transaction {
  id: string; date: string; time: string; amount: number
  paymentMethod: string; itemCount: number; pharmacist: string
}
interface ReportData {
  period: number; summary: Summary; paymentBreakdown: PaymentBreakdown
  dailyRevenue: DailyRevenue[]; medicinePerformance: MedPerformance[]
  categoryRevenue: CategoryRevenue[]; inventorySummary: InventorySummary
  recentTransactions: Transaction[]
}

function formatLKR(n: number) {
  if (n >= 1000000) return `LKR ${(n / 1000000).toFixed(2)}M`
  if (n >= 1000) return `LKR ${(n / 1000).toFixed(1)}K`
  return `LKR ${n.toFixed(0)}`
}

function exportCSV(data: ReportData) {
  const lines: string[] = []

  lines.push('SMARTERP PHARMACY — SALES REPORT')
  lines.push(`Period: Last ${data.period} days`)
  lines.push(`Generated: ${new Date().toLocaleString('en-LK')}`)
  lines.push('')

  lines.push('SUMMARY')
  lines.push(`Total Revenue,${formatLKR(data.summary.totalRevenue)}`)
  lines.push(`Total Transactions,${data.summary.totalTransactions}`)
  lines.push(`Average Sale Value,${formatLKR(data.summary.avgSaleValue)}`)
  lines.push('')

  lines.push('PAYMENT BREAKDOWN')
  lines.push('Method,Transactions,Amount')
  Object.entries(data.paymentBreakdown).forEach(([method, d]) => {
    lines.push(`${method},${d.count},${formatLKR(d.amount)}`)
  })
  lines.push('')

  lines.push('TOP MEDICINES BY REVENUE')
  lines.push('Medicine,Category,Units Sold,Revenue')
  data.medicinePerformance.forEach(m => {
    lines.push(`${m.name},${m.category},${m.qty},${formatLKR(m.revenue)}`)
  })
  lines.push('')

  lines.push('RECENT TRANSACTIONS')
  lines.push('Date,Time,Amount,Payment,Items,Pharmacist')
  data.recentTransactions.forEach(t => {
    lines.push(`${t.date},${t.time},${formatLKR(t.amount)},${t.paymentMethod},${t.itemCount},${t.pharmacist}`)
  })
  lines.push('')

  lines.push('INVENTORY SUMMARY')
  lines.push(`Total SKUs,${data.inventorySummary.totalSKUs}`)
  lines.push(`In Stock,${data.inventorySummary.inStock}`)
  lines.push(`Low Stock,${data.inventorySummary.lowStock}`)
  lines.push(`Out of Stock,${data.inventorySummary.outOfStock}`)
  lines.push(`Expiring in 30 days,${data.inventorySummary.expiringIn30}`)
  lines.push(`Total Stock Value,${formatLKR(data.inventorySummary.totalStockValue)}`)

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SmartERP_Report_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')
  const [activeSection, setActiveSection] = useState<'sales' | 'inventory' | 'medicines' | 'transactions'>('sales')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchReport = (p: string) => {
    setLoading(true)
    fetch(`/api/reports?period=${p}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (status === 'authenticated') fetchReport(period) }, [status])

  const handlePeriodChange = (p: string) => { setPeriod(p); fetchReport(p) }

  const maxDailyRev = Math.max(...(data?.dailyRevenue.map(d => d.amount) ?? [1]), 1)
  const maxMedRev = data?.medicinePerformance[0]?.revenue ?? 1

  if (status === 'loading' || loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Generating report...
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', color: 'white' }}>

      {/* Sidebar */}
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

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Reports</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Sales performance · Inventory · Medicine analysis · Export to CSV</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Period selector */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px' }}>
              {[['7', '7D'], ['30', '30D'], ['90', '90D'], ['365', '1Y']].map(([val, label]) => (
                <button key={val} onClick={() => handlePeriodChange(val)}
                  style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: period === val ? 'rgba(59,130,246,0.2)' : 'transparent', color: period === val ? '#60a5fa' : 'rgba(255,255,255,0.35)', transition: 'all 0.15s' }}
                >{label}</button>
              ))}
            </div>
            {data && (
              <button onClick={() => exportCSV(data)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(16,185,129,0.25)' }}>
                ↓ Export CSV
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>⚠ {error}</div>}

        {/* Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'TOTAL REVENUE', value: formatLKR(data?.summary.totalRevenue ?? 0), sub: data?.summary.revenueChange ? `${Number(data.summary.revenueChange) >= 0 ? '+' : ''}${data.summary.revenueChange}% vs prev period` : 'No prev data', color: '#10b981' },
            { label: 'TRANSACTIONS', value: String(data?.summary.totalTransactions ?? 0), sub: `vs ${data?.summary.prevTransactions ?? 0} prev period`, color: '#3b82f6' },
            { label: 'AVG SALE VALUE', value: formatLKR(data?.summary.avgSaleValue ?? 0), sub: `Per transaction`, color: '#8b5cf6' },
            { label: 'STOCK VALUE', value: formatLKR(data?.inventorySummary.totalStockValue ?? 0), sub: 'Current inventory value', color: '#f59e0b' },
          ].map(k => (
            <div key={k.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', marginBottom: '10px' }}>{k.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: k.color, marginBottom: '6px' }}>{k.value}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '4px', width: 'fit-content', marginBottom: '20px' }}>
          {([['sales', '📈 Sales'], ['medicines', '💊 Medicines'], ['inventory', '📦 Inventory'], ['transactions', '🧾 Transactions']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveSection(key)}
              style={{ padding: '7px 18px', borderRadius: '7px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: activeSection === key ? 'rgba(59,130,246,0.2)' : 'transparent', color: activeSection === key ? '#60a5fa' : 'rgba(255,255,255,0.35)', transition: 'all 0.15s' }}
            >{label}</button>
          ))}
        </div>

        {/* ── SALES SECTION ── */}
        {activeSection === 'sales' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
            {/* Daily revenue chart */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Daily Revenue</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Last {period} days</p>
              {(data?.dailyRevenue.length ?? 0) === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No sales data yet — process sales via POS</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px' }}>
                  {data!.dailyRevenue.map((d, i) => (
                    <div key={i} title={`${d.date}: ${formatLKR(d.amount)}`}
                      style={{ flex: 1, height: `${Math.max((d.amount / maxDailyRev) * 150, 3)}px`, background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)', borderRadius: '3px 3px 0 0', opacity: 0.8, cursor: 'pointer', transition: 'opacity 0.15s', minWidth: '4px' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.8'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Payment breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Payment Methods</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Cash vs Card breakdown</p>
              {Object.keys(data?.paymentBreakdown ?? {}).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No payment data yet</div>
              ) : (
                Object.entries(data?.paymentBreakdown ?? {}).map(([method, d]) => {
                  const total = Object.values(data?.paymentBreakdown ?? {}).reduce((s, v) => s + v.amount, 0)
                  const pct = total > 0 ? Math.round((d.amount / total) * 100) : 0
                  const color = method === 'CASH' ? '#10b981' : '#3b82f6'
                  return (
                    <div key={method} style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{method === 'CASH' ? '💵 Cash' : '💳 Card'}</span>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginBottom: '4px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                        <span>{d.count} transactions</span>
                        <span>{formatLKR(d.amount)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── MEDICINES SECTION ── */}
        {activeSection === 'medicines' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
            {/* Medicine performance table */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Medicine Performance</h3>
              </div>
              {(data?.medicinePerformance.length ?? 0) === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No sales data yet</div>
              ) : (
                <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data!.medicinePerformance.map((med, i) => (
                    <div key={med.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>{med.name}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px' }}>{med.category}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>{formatLKR(med.revenue)}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px' }}>{med.qty} units</span>
                        </div>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${(med.revenue / maxMedRev) * 100}%`, background: i === 0 ? '#10b981' : i === 1 ? '#3b82f6' : i === 2 ? '#8b5cf6' : 'rgba(255,255,255,0.2)', borderRadius: '3px', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category revenue */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Revenue by Category</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Category breakdown</p>
              {(data?.categoryRevenue.length ?? 0) === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No data yet</div>
              ) : (
                data!.categoryRevenue.map((cat, i) => {
                  const total = data!.categoryRevenue.reduce((s, c) => s + c.revenue, 0)
                  const pct = total > 0 ? Math.round((cat.revenue / total) * 100) : 0
                  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899']
                  return (
                    <div key={cat.category} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{cat.category}</span>
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: '3px' }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── INVENTORY SECTION ── */}
        {activeSection === 'inventory' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: 'Total SKUs', value: data?.inventorySummary.totalSKUs ?? 0, color: '#3b82f6', icon: '◈' },
              { label: 'In Stock', value: data?.inventorySummary.inStock ?? 0, color: '#10b981', icon: '✓' },
              { label: 'Low Stock', value: data?.inventorySummary.lowStock ?? 0, color: '#f59e0b', icon: '⚠' },
              { label: 'Out of Stock', value: data?.inventorySummary.outOfStock ?? 0, color: '#ef4444', icon: '✗' },
              { label: 'Expiring in 30d', value: data?.inventorySummary.expiringIn30 ?? 0, color: '#ef4444', icon: '⏳' },
              { label: 'Expiring in 90d', value: data?.inventorySummary.expiringIn90 ?? 0, color: '#f59e0b', icon: '⏳' },
            ].map(k => (
              <div key={k.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px' }}>{k.label.toUpperCase()}</span>
                  <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${k.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: k.color }}>{k.icon}</span>
                </div>
                <div style={{ fontSize: '36px', fontWeight: '700', color: k.color }}>{k.value}</div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', marginBottom: '8px' }}>TOTAL STOCK VALUE</div>
                <div style={{ fontSize: '36px', fontWeight: '700', color: '#10b981' }}>{formatLKR(data?.inventorySummary.totalStockValue ?? 0)}</div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Current value of all medicines in stock</div>
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS SECTION ── */}
        {activeSection === 'transactions' && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Recent Transactions</h3>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Last 20 transactions</span>
            </div>
            {(data?.recentTransactions.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🧾</div>
                No transactions yet — process sales via POS
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['DATE', 'TIME', 'AMOUNT', 'PAYMENT', 'ITEMS', 'PHARMACIST'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data!.recentTransactions.map((t, i) => (
                    <tr key={i}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{t.date}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{t.time}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#10b981' }}>{formatLKR(t.amount)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: t.paymentMethod === 'CASH' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: t.paymentMethod === 'CASH' ? '#10b981' : '#60a5fa', border: `1px solid ${t.paymentMethod === 'CASH' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
                          {t.paymentMethod === 'CASH' ? '💵 Cash' : '💳 Card'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{t.itemCount} units</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{t.pharmacist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}