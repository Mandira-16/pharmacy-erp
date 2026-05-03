'use client'

import { useState, useEffect, useCallback } from 'react'
import AppLayout from '../../components/AppLayout'

interface AlertMeta { surplusUnits?: number; daysToExpiry?: number; suggestedDiscount?: number; predictedDemand90?: number; potentialLossLKR?: number; currentStock?: number; predictedDemand30?: number; deficit?: number; reorderQty?: number; leadTimeDays?: number }
interface Alert { id: string; alertType: 'EXPIRY_LIQUIDATION' | 'STOCKOUT_RISK'; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'; message: string; metadata: string | null; createdAt: string; medicine: { name: string; category: string; unitPrice: string; sku: string } }
interface DSSResult { medicine: string; currentStock: number; daysToExpiry: number; unitPrice: number; predictions: { day30: number; day60: number; day90: number }; revenueProjection: { day30: number; day90: number }; action: string; confidence: number }
interface Summary { total: number; expiry: number; stockout: number; critical: number; high: number }
interface RunSummary { totalMedicinesAnalysed: number; expiryAlerts: number; stockoutAlerts: number; totalAlertsGenerated: number }

function parseMeta(raw: string | null): AlertMeta { if (!raw) return {}; try { return JSON.parse(raw) } catch { return {} } }
function formatLKR(n: number) { return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n) }

const sevColors: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6' }

export default function DSSPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, expiry: 0, stockout: 0, critical: 0, high: 0 })
  const [results, setResults] = useState<DSSResult[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [running, setRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'expiry' | 'stockout'>('all')
  const [lastRunTime, setLastRunTime] = useState<string | null>(null)
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    setLoadingAlerts(true)
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

  const runEngine = async () => {
    setRunning(true); setError(null)
    try {
      const res = await fetch('/api/dss/run', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRunSummary(data.summary); setResults(data.results ?? [])
      setLastRunTime(new Date().toLocaleTimeString('en-LK'))
      await fetchAlerts()
    } catch (e: any) { setError(e.message) }
    finally { setRunning(false) }
  }

  const resolveAlert = async (id: string) => {
    await fetch('/api/dss/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alertId: id }) })
    setAlerts(prev => prev.filter(a => a.id !== id))
    setSummary(prev => ({ ...prev, total: prev.total - 1 }))
  }

  const filtered = alerts.filter(a => activeTab === 'all' ? true : activeTab === 'expiry' ? a.alertType === 'EXPIRY_LIQUIDATION' : a.alertType === 'STOCKOUT_RISK')
  const total30 = results.reduce((s, r) => s + r.revenueProjection.day30, 0)
  const total90 = results.reduce((s, r) => s + r.revenueProjection.day90, 0)
  const topMeds = [...results].sort((a, b) => b.revenueProjection.day30 - a.revenueProjection.day30).slice(0, 5)
  const maxRev = topMeds[0]?.revenueProjection.day30 ?? 1

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Smart Alerts</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>AI-powered stockout prevention · Expiry management · Revenue forecasting</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            {lastRunTime && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>Last run: {lastRunTime}</span>}
            <button onClick={runEngine} disabled={running}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: running ? 'var(--bg-surface-2)' : 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: running ? 'var(--text-tertiary)' : 'white', fontSize: '13px', fontWeight: '700', cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: running ? 'none' : '0 2px 8px rgba(37,99,235,0.3)' }}>
              {running ? <><span style={{ width: '12px', height: '12px', border: '2px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Analysing...</> : '⚡ Run Analysis'}
            </button>
          </div>
        </div>

        {runSummary && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {[
              { label: `✓ ${runSummary.totalMedicinesAnalysed} medicines analysed`, color: '#2563eb' },
              { label: `⏳ ${runSummary.expiryAlerts} expiry alerts`, color: '#f59e0b' },
              { label: `🚨 ${runSummary.stockoutAlerts} stockout alerts`, color: '#ef4444' },
            ].map(b => (
              <span key={b.label} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '20px', background: `${b.color}10`, border: `1px solid ${b.color}25`, color: b.color, fontWeight: '500' }}>{b.label}</span>
            ))}
          </div>
        )}

        {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--danger)', fontSize: '13px' }}>⚠ {error}</div>}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Active Alerts', value: summary.total, color: '#2563eb' },
            { label: 'Critical', value: summary.critical, color: '#ef4444' },
            { label: 'Expiry Risks', value: summary.expiry, color: '#f59e0b' },
            { label: 'Stockout Risks', value: summary.stockout, color: '#8b5cf6' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>{k.label}</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          {/* Alerts */}
          <div>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '4px', width: 'fit-content', marginBottom: '16px' }}>
              {([['all', `All (${alerts.length})`], ['expiry', `⏳ Expiry (${summary.expiry})`], ['stockout', `🚨 Stockout (${summary.stockout})`]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: activeTab === key ? 'var(--brand-primary)' : 'transparent', color: activeTab === key ? 'white' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                  {label}
                </button>
              ))}
            </div>

            {loadingAlerts ? (
              <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Loading alerts...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-lg)', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                <p style={{ fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>No active alerts</p>
                <p style={{ fontSize: '12px' }}>{alerts.length === 0 ? 'Click Run Analysis to check inventory' : 'No alerts in this category'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filtered.map(alert => {
                  const meta = parseMeta(alert.metadata)
                  const isExpiry = alert.alertType === 'EXPIRY_LIQUIDATION'
                  const color = sevColors[alert.severity] ?? '#6b7280'
                  return (
                    <div key={alert.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)', borderLeft: `4px solid ${color}` }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: `${color}15`, color: color, border: `1px solid ${color}25` }}>{alert.severity}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '500' }}>{isExpiry ? '⏳ Expiry Risk' : '🚨 Stockout Risk'}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{alert.medicine.category} · {alert.medicine.sku}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '14px' }}>{alert.message}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '14px' }}>
                        {isExpiry ? (
                          <>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Surplus</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--warning)' }}>{meta.surplusUnits ?? 0}</div></div>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Days left</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger)' }}>{meta.daysToExpiry ?? 0}</div></div>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Discount</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--warning)' }}>{meta.suggestedDiscount ?? 0}%</div></div>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demand 90d</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{meta.predictedDemand90 ?? 0}</div></div>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loss avoided</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--success)' }}>{formatLKR(meta.potentialLossLKR ?? 0)}</div></div>
                          </>
                        ) : (
                          <>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock</div><div style={{ fontSize: '12px', fontWeight: '700', color: (meta.currentStock ?? 0) === 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{meta.currentStock ?? 0}</div></div>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demand 30d</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--warning)' }}>{meta.predictedDemand30 ?? 0}</div></div>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deficit</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger)' }}>{meta.deficit ?? 0}</div></div>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reorder</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--warning)' }}>{meta.reorderQty ?? 0}</div></div>
                            <div style={{ background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}><div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lead time</div><div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{meta.leadTimeDays ?? 7}d</div></div>
                          </>
                        )}
                      </div>
                      <button onClick={() => resolveAlert(alert.id)} style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--success)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--success-border)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-default)' }}
                      >✓ Mark Resolved</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {results.length > 0 ? (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Revenue Forecast</h3>
                  <span style={{ fontSize: '10px', fontWeight: '600', background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', padding: '2px 8px', borderRadius: '20px' }}>AI</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Predicted demand × unit price</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  {[{ label: '30-Day', value: formatLKR(total30) }, { label: '90-Day', value: formatLKR(total90) }].map(t => (
                    <div key={t.label} style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: 'var(--success)', marginBottom: '4px', fontWeight: '600' }}>{t.label}</div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--success)' }}>{t.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topMeds.map(r => (
                    <div key={r.medicine} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', width: '80px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.medicine}</span>
                      <div style={{ flex: 1, height: '5px', background: 'var(--bg-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(r.revenueProjection.day30/maxRev)*100}%`, background: '#10b981', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600', width: '70px', textAlign: 'right', flexShrink: 0 }}>{formatLKR(r.revenueProjection.day30)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '40px 20px', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '4px' }}>Revenue Forecast</p>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Run analysis to see projections</p>
              </div>
            )}

            {[
              { tag: 'Revenue Forecast', desc: 'Projects monthly revenue by multiplying AI-predicted demand by unit price for each medicine.', color: '#10b981' },
              { tag: 'Expiry Management', desc: 'Detects surplus stock nearing expiry and recommends clearance discounts to recover capital.', color: '#f59e0b' },
              { tag: 'Stockout Prevention', desc: 'Calculates reorder quantities with lead time buffer when predicted demand exceeds current stock.', color: '#ef4444' },
            ].map(f => (
              <div key={f.tag} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-sm)', borderLeft: `3px solid ${f.color}` }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>{f.tag}</div>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.6' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}