'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'

interface ModelHealth { status: string; model: string; accuracy: number; mape: number; training_records: number; n_features: number; feature_importances: Record<string, number> }
interface Prediction { medicine: string; category: string; current_stock: number; predicted_30: number; predicted_60: number; predicted_90: number; action: string; action_color: string; confidence: number }

export default function ForecastingPage() {
  const { status } = useSession()
  const router = useRouter()
  const [health, setHealth] = useState<ModelHealth | null>(null)
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [horizon, setHorizon] = useState<'30' | '60' | '90'>('30')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    const fetchModel = async () => {
      try {
        const res = await fetch('https://comfortable-encouragement-production-fd8b.up.railway.app/health')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setHealth(data); setConnected(true)
      } catch { setConnected(false) }
      finally { setLoading(false) }
    }
    fetchModel()
  }, [status])

  const runForecast = async () => {
    setLoading(true)
    try {
      const medRes = await fetch('/api/inventory')
      const medData = await medRes.json()
      const medicines = (medData.medicines ?? []).map((m: any) => ({ medicine: m.name, category: m.category, current_stock: m.totalStock, avg_daily_sales: 15, unit_price: m.unitPrice, days_to_expiry: m.daysToExpiry ?? 365, medicine_id: m.id }))
      const res = await fetch('https://comfortable-encouragement-production-fd8b.up.railway.app/predict/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ medicines }) })
      const data = await res.json()
      setPredictions(data.results ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const features = health?.feature_importances ? Object.entries(health.feature_importances).sort((a, b) => b[1] - a[1]).slice(0, 7) : []
  const maxFeature = features[0]?.[1] ?? 1

  const actionColors: Record<string, string> = { 'Critical Reorder': 'var(--danger)', 'Reorder Soon': 'var(--warning)', 'Monitor': 'var(--info)', 'Well Stocked': 'var(--success)' }

  const featureLabels: Record<string, string> = { rolling_mean_7: '7-day sales average', month: 'Seasonal factor (month)', days_since_start: 'Long-term trend', rolling_mean_30: '30-day sales average', rolling_std_7: 'Sales volatility', lag_30: '30-day sales lag', lag_7: '7-day sales lag', lag_1: 'Yesterday sales', lag_14: '14-day sales lag', is_weekend: 'Weekend pattern', is_month_end: 'Month-end pattern', category_encoded: 'Medicine category', day_of_week: 'Day of week' }

  if (status === 'loading') return <AppLayout><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /></div></AppLayout>

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Demand Forecast</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>AI-powered medicine demand prediction · Reorder recommendations</p>
          </div>
          <button onClick={runForecast} disabled={!connected || loading} style={{ padding: '10px 20px', background: !connected ? 'var(--bg-surface-3)' : 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: !connected ? 'var(--text-tertiary)' : 'white', fontSize: '13px', fontWeight: '700', cursor: !connected ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: connected ? '0 2px 8px rgba(37,99,235,0.3)' : 'none' }}>
            {loading ? 'Loading...' : '▶ Run Forecast'}
          </button>
        </div>

        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: connected ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${connected ? 'var(--success-border)' : 'var(--danger-border)'}`, borderRadius: 'var(--radius-md)', marginBottom: '24px', fontSize: '13px', color: connected ? 'var(--success)' : 'var(--danger)', fontWeight: '500' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? 'var(--success)' : 'var(--danger)', animation: connected ? 'none' : 'none' }} />
          {connected ? `AI model connected — ${health?.model ?? 'Gradient Boosted Trees'} · Ready for predictions` : 'AI model not connected — start the forecast service to enable predictions'}
        </div>

        {connected && health && (
          <>
            {/* Model metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Forecast Accuracy', value: `${health.accuracy.toFixed(1)}%`, sub: 'Model performance', color: '#10b981' },
                { label: 'Error Rate', value: `${health.mape.toFixed(1)}%`, sub: 'Mean absolute % error', color: '#2563eb' },
                { label: 'Training Records', value: health.training_records.toLocaleString(), sub: 'Historical data points', color: '#8b5cf6' },
                { label: 'Prediction Features', value: String(health.n_features), sub: 'Input variables used', color: '#f59e0b' },
              ].map(k => (
                <div key={k.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>{k.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: k.color, marginBottom: '4px' }}>{k.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', marginBottom: '20px' }}>
              {/* Predictions table */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Demand Predictions</h3>
                  <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
                    {(['30', '60', '90'] as const).map(h => (
                      <button key={h} onClick={() => setHorizon(h)} style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', background: horizon === h ? 'var(--brand-primary)' : 'transparent', color: horizon === h ? 'white' : 'var(--text-secondary)', transition: 'all 0.15s' }}>{h}d</button>
                    ))}
                  </div>
                </div>
                {predictions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
                    <p style={{ fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>No predictions yet</p>
                    <p>Click Run Forecast to generate predictions</p>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ background: 'var(--bg-surface-2)' }}>{['Medicine', 'Category', 'Current Stock', `${horizon}-Day Forecast`, 'Confidence', 'Recommendation'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {predictions.map((pred, i) => {
                        const forecast = horizon === '30' ? pred.predicted_30 : horizon === '60' ? pred.predicted_60 : pred.predicted_90
                        const actionColor = actionColors[pred.action] ?? 'var(--text-secondary)'
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-surface-2)'}
                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{pred.medicine}</td>
                            <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{pred.category}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: pred.current_stock < 100 ? 'var(--danger)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>{pred.current_stock}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: 'var(--brand-primary)', whiteSpace: 'nowrap' }}>{Math.ceil(forecast).toLocaleString()}</td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ height: '5px', width: '60px', background: 'var(--bg-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pred.confidence}%`, background: 'var(--success)', borderRadius: '3px' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{pred.confidence.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: `${actionColor}12`, color: actionColor, border: `1px solid ${actionColor}25` }}>{pred.action}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Feature importance */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Prediction Factors</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>What drives the forecast</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {features.map(([feature, importance]) => (
                    <div key={feature}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{featureLabels[feature] ?? feature}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--brand-primary)' }}>{(importance * 100).toFixed(0)}%</span>
                      </div>
                      <div style={{ height: '5px', background: 'var(--bg-surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(importance / maxFeature) * 100}%`, background: 'var(--brand-primary)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}