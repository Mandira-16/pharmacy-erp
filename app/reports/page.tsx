'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'

interface Summary { totalRevenue: number; prevRevenue: number; revenueChange: string | null; totalTransactions: number; avgSaleValue: number; prevTransactions: number }
interface PaymentBreakdown { [key: string]: { count: number; amount: number } }
interface DailyRevenue { date: string; amount: number }
interface MedPerformance { id: string; name: string; category: string; qty: number; revenue: number }
interface CategoryRevenue { category: string; revenue: number }
interface InventorySummary { totalSKUs: number; inStock: number; lowStock: number; outOfStock: number; expiringIn30: number; expiringIn90: number; totalStockValue: number }
interface Transaction { id: string; date: string; time: string; amount: number; paymentMethod: string; itemCount: number; pharmacist: string }
interface ReportData { period: number; summary: Summary; paymentBreakdown: PaymentBreakdown; dailyRevenue: DailyRevenue[]; medicinePerformance: MedPerformance[]; categoryRevenue: CategoryRevenue[]; inventorySummary: InventorySummary; recentTransactions: Transaction[] }

function fmt(n: number) { if (n >= 1000000) return `LKR ${(n/1000000).toFixed(2)}M`; if (n >= 1000) return `LKR ${(n/1000).toFixed(1)}K`; return `LKR ${n.toFixed(0)}` }

function exportCSV(data: ReportData) {
  const lines = ['CEYLON PHARMACY — SALES REPORT', `Period: Last ${data.period} days`, `Generated: ${new Date().toLocaleString('en-LK')}`, '', 'SUMMARY', `Total Revenue,${fmt(data.summary.totalRevenue)}`, `Transactions,${data.summary.totalTransactions}`, `Avg Sale,${fmt(data.summary.avgSaleValue)}`, '', 'PAYMENT BREAKDOWN', 'Method,Transactions,Amount', ...Object.entries(data.paymentBreakdown).map(([m, d]) => `${m},${d.count},${fmt(d.amount)}`), '', 'TOP MEDICINES', 'Medicine,Category,Units,Revenue', ...data.medicinePerformance.map(m => `${m.name},${m.category},${m.qty},${fmt(m.revenue)}`), '', 'RECENT TRANSACTIONS', 'Date,Time,Amount,Payment,Items,Pharmacist', ...data.recentTransactions.map(t => `${t.date},${t.time},${fmt(t.amount)},${t.paymentMethod},${t.itemCount},${t.pharmacist}`)]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `CeylonPharmacy_Report_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')
  const [activeSection, setActiveSection] = useState<'sales' | 'inventory' | 'medicines' | 'transactions'>('sales')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchReport = (p: string) => { setLoading(true); fetch(`/api/reports?period=${p}`).then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); setData(d) }).catch(e => setError(e.message)).finally(() => setLoading(false)) }

  useEffect(() => { if (status === 'authenticated') fetchReport(period) }, [status])

  const maxDailyRev = Math.max(...(data?.dailyRevenue.map(d => d.amount) ?? [1]), 1)
  const maxMedRev = data?.medicinePerformance[0]?.revenue ?? 1

  if (status === 'loading' || loading) return <AppLayout><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}><div style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /><span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Generating report...</span></div></AppLayout>

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Reports</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Sales performance · Inventory health · Medicine analysis</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
              {[['7', '7D'], ['30', '30D'], ['90', '90D'], ['365', '1Y']].map(([val, label]) => (
                <button key={val} onClick={() => { setPeriod(val); fetchReport(val) }} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: period === val ? 'var(--brand-primary)' : 'transparent', color: period === val ? 'white' : 'var(--text-secondary)', transition: 'all 0.15s' }}>{label}</button>
              ))}
            </div>
            {data && <button onClick={() => exportCSV(data)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'var(--success)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}>↓ Export CSV</button>}
          </div>
        </div>

        {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--danger)', fontSize: '13px' }}>⚠ {error}</div>}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Revenue', value: fmt(data?.summary.totalRevenue ?? 0), sub: data?.summary.revenueChange ? `${Number(data.summary.revenueChange) >= 0 ? '+' : ''}${data.summary.revenueChange}% vs prev period` : 'No prev data', color: '#10b981' },
            { label: 'Transactions', value: String(data?.summary.totalTransactions ?? 0), sub: `vs ${data?.summary.prevTransactions ?? 0} prev period`, color: '#2563eb' },
            { label: 'Avg Sale Value', value: fmt(data?.summary.avgSaleValue ?? 0), sub: 'Per transaction', color: '#8b5cf6' },
            { label: 'Stock Value', value: fmt(data?.inventorySummary.totalStockValue ?? 0), sub: 'Current inventory', color: '#f59e0b' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>{k.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: k.color, marginBottom: '4px' }}>{k.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '4px', width: 'fit-content', marginBottom: '20px' }}>
          {([['sales', '📈 Sales'], ['medicines', '💊 Medicines'], ['inventory', '📦 Inventory'], ['transactions', '🧾 Transactions']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveSection(key)} style={{ padding: '7px 18px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: activeSection === key ? 'var(--brand-primary)' : 'transparent', color: activeSection === key ? 'white' : 'var(--text-secondary)', transition: 'all 0.15s' }}>{label}</button>
          ))}
        </div>

        {/* Sales */}
        {activeSection === 'sales' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Daily Revenue</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Last {period} days</p>
              {(data?.dailyRevenue.length ?? 0) === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', fontSize: '13px' }}>No sales data yet</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '160px' }}>
                  {data!.dailyRevenue.map((d, i) => (
                    <div key={i} title={`${d.date}: ${fmt(d.amount)}`} style={{ flex: 1, height: `${Math.max((d.amount/maxDailyRev)*150, 3)}px`, background: 'var(--brand-primary)', borderRadius: '3px 3px 0 0', opacity: 0.7, cursor: 'pointer', transition: 'opacity 0.15s', minWidth: '3px' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.7'}
                    />
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Payment Methods</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Cash vs Card</p>
              {Object.keys(data?.paymentBreakdown ?? {}).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '13px' }}>No data yet</div>
              ) : Object.entries(data?.paymentBreakdown ?? {}).map(([method, d]) => {
                const total = Object.values(data?.paymentBreakdown ?? {}).reduce((s, v) => s + v.amount, 0)
                const pct = total > 0 ? Math.round((d.amount/total)*100) : 0
                const color = method === 'CASH' ? '#10b981' : '#2563eb'
                return (
                  <div key={method} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{method === 'CASH' ? '💵 Cash' : '💳 Card'}</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--bg-surface-2)', borderRadius: '3px', marginBottom: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      <span>{d.count} transactions</span><span>{fmt(d.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Medicines */}
        {activeSection === 'medicines' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '16px' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}><h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Medicine Performance</h3></div>
              {(data?.medicinePerformance.length ?? 0) === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', fontSize: '13px' }}>No sales data yet</div>
              ) : (
                <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {data!.medicinePerformance.map((med, i) => (
                    <div key={med.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div><span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{med.name}</span><span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{med.category}</span></div>
                        <div style={{ textAlign: 'right' }}><span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--success)' }}>{fmt(med.revenue)}</span><span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{med.qty} units</span></div>
                      </div>
                      <div style={{ height: '5px', background: 'var(--bg-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(med.revenue/maxMedRev)*100}%`, background: i === 0 ? '#10b981' : i === 1 ? '#2563eb' : i === 2 ? '#8b5cf6' : 'var(--border-strong)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>By Category</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Revenue breakdown</p>
              {(data?.categoryRevenue.length ?? 0) === 0 ? <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '13px' }}>No data</div> : data!.categoryRevenue.map((cat, i) => {
                const total = data!.categoryRevenue.reduce((s, c) => s + c.revenue, 0)
                const pct = total > 0 ? Math.round((cat.revenue/total)*100) : 0
                const colors = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4']
                return (
                  <div key={cat.category} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{cat.category}</span>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: '5px', background: 'var(--bg-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: '3px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Inventory */}
        {activeSection === 'inventory' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { label: 'Total Medicines', value: data?.inventorySummary.totalSKUs ?? 0, color: '#2563eb', icon: '💊' },
              { label: 'In Stock', value: data?.inventorySummary.inStock ?? 0, color: '#10b981', icon: '✓' },
              { label: 'Low Stock', value: data?.inventorySummary.lowStock ?? 0, color: '#f59e0b', icon: '⚠' },
              { label: 'Out of Stock', value: data?.inventorySummary.outOfStock ?? 0, color: '#ef4444', icon: '✗' },
              { label: 'Expiring in 30 days', value: data?.inventorySummary.expiringIn30 ?? 0, color: '#ef4444', icon: '⏳' },
              { label: 'Expiring in 90 days', value: data?.inventorySummary.expiringIn90 ?? 0, color: '#f59e0b', icon: '📅' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{k.label}</span>
                  <span style={{ fontSize: '18px' }}>{k.icon}</span>
                </div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: k.color }}>{k.value}</div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', background: 'var(--bg-surface)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div><div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Total Stock Value</div><div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--success)' }}>{fmt(data?.inventorySummary.totalStockValue ?? 0)}</div></div>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Current value of all medicines in stock</span>
            </div>
          </div>
        )}

        {/* Transactions */}
        {activeSection === 'transactions' && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Recent Transactions</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Last 20</span>
            </div>
            {(data?.recentTransactions.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)', fontSize: '13px' }}><div style={{ fontSize: '32px', marginBottom: '12px' }}>🧾</div>No transactions yet</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ background: 'var(--bg-surface-2)' }}>{['Date', 'Time', 'Amount', 'Payment', 'Items', 'Pharmacist'].map(h => <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-default)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {data!.recentTransactions.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-surface-2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t.date}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{t.time}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: 'var(--success)' }}>{fmt(t.amount)}</td>
                      <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: t.paymentMethod === 'CASH' ? 'var(--success-bg)' : 'var(--info-bg)', color: t.paymentMethod === 'CASH' ? 'var(--success)' : 'var(--info)', border: `1px solid ${t.paymentMethod === 'CASH' ? 'var(--success-border)' : 'var(--info-border)'}` }}>{t.paymentMethod}</span></td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t.itemCount}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t.pharmacist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}