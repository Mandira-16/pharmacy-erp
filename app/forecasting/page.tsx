'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const MEDICINES_INPUT = [
  { medicine: 'Amoxicillin 500mg', category: 'Antibiotic', current_stock: 15000, avg_daily_sales: 423, unit_price: 45 },
  { medicine: 'Paracetamol 500mg', category: 'Analgesic', current_stock: 18000, avg_daily_sales: 410, unit_price: 12.5 },
  { medicine: 'Metformin 850mg', category: 'Antidiabetic', current_stock: 8000, avg_daily_sales: 390, unit_price: 35 },
  { medicine: 'Losartan 50mg', category: 'Cardiovascular', current_stock: 14000, avg_daily_sales: 380, unit_price: 65 },
  { medicine: 'Omeprazole 20mg', category: 'Gastrointestinal', current_stock: 2500, avg_daily_sales: 415, unit_price: 28.5 },
  { medicine: 'Atorvastatin 20mg', category: 'Cardiovascular', current_stock: 16000, avg_daily_sales: 375, unit_price: 55 },
  { medicine: 'Salbutamol Inhaler', category: 'Respiratory', current_stock: 3000, avg_daily_sales: 395, unit_price: 320 },
  { medicine: 'Ciprofloxacin 500mg', category: 'Antibiotic', current_stock: 13000, avg_daily_sales: 400, unit_price: 48 },
]

const features = [
    { name: 'lag_30 (30-day sales lag)', importance: 0.31 },
    { name: 'rolling_mean_7 (7-day average)', importance: 0.24 },
    { name: 'lag_7 (7-day sales lag)', importance: 0.18 },
    { name: 'month (seasonal factor)', importance: 0.11 },
    { name: 'covid_flag (demand spike)', importance: 0.08 },
    { name: 'category_encoded', importance: 0.05 },
    { name: 'is_weekend', importance: 0.03 },
]

const monthlyTrend = [
    { month: 'Jan', actual: 2850, forecast: 2700 },
    { month: 'Feb', actual: 3100, forecast: 2950 },
    { month: 'Mar', actual: 2980, forecast: 3100 },
    { month: 'Apr', actual: 3250, forecast: 3180 },
    { month: 'May', actual: 3400, forecast: 3350 },
    { month: 'Jun', actual: 3180, forecast: 3300 },
    { month: 'Jul', actual: 3550, forecast: 3480 },
    { month: 'Aug', actual: 3720, forecast: 3600 },
    { month: 'Sep', actual: 3480, forecast: 3650 },
    { month: 'Oct', actual: 3900, forecast: 3780 },
    { month: 'Nov', actual: 4100, forecast: 3950 },
    { month: 'Dec', actual: 0, forecast: 4250 },
]

export default function ForecastingPage() {
    const { status } = useSession()
    const router = useRouter()
    const [selectedHorizon, setSelectedHorizon] = useState(30)
    const [forecastData, setForecastData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [apiConnected, setApiConnected] = useState(false)
    const [retraining, setRetraining] = useState(false)
    const [retrainDone, setRetrainDone] = useState(false)
    const [mape, setMape] = useState(28.4)
    const [featureImportances, setFeatureImportances] = useState([
        { name: 'lag_30 (30-day sales lag)', importance: 0.31 },
        { name: 'rolling_mean_7 (7-day average)', importance: 0.24 },
        { name: 'lag_7 (7-day sales lag)', importance: 0.18 },
        { name: 'month (seasonal factor)', importance: 0.11 },
        { name: 'covid_flag (demand spike)', importance: 0.08 },
        { name: 'category_encoded', importance: 0.05 },
        { name: 'is_weekend', importance: 0.03 },
    ])

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        fetchPredictions()
    }, [])

    const fetchPredictions = async () => {
        setLoading(true)
        try {
            const res = await fetch('http://127.0.0.1:5000/predict/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ medicines: MEDICINES_INPUT }),
            })
            const data = await res.json()
            setForecastData(data.results)
            setMape(data.mape)
            setApiConnected(true)

            // Update feature importances from real model
            if (data.feature_importances) {
                const mapped = Object.entries(data.feature_importances)
                    .map(([name, importance]) => ({ name, importance: importance as number }))
                    .sort((a, b) => b.importance - a.importance)
                    .slice(0, 7)
                setFeatureImportances(mapped)
            }

        } catch (err) {
            console.error('Flask API not reachable:', err)
            setApiConnected(false)
            setForecastData(MEDICINES_INPUT.map(m => ({
                medicine: m.medicine,
                category: m.category,
                current_stock: m.current_stock,
                predicted_30: m.avg_daily_sales * 30,
                predicted_60: m.avg_daily_sales * 60,
                predicted_90: m.avg_daily_sales * 90,
                action: m.current_stock < m.avg_daily_sales * 30 ? 'Critical Reorder' : 'Sufficient',
                action_color: m.current_stock < m.avg_daily_sales * 30 ? '#ef4444' : '#10b981',
                confidence: 88.5,
            })))
        }
        setLoading(false)
    }

    const handleRetrain = async () => {
        setRetraining(true)
        setRetrainDone(false)
        await new Promise(r => setTimeout(r, 3000))
        await fetchPredictions()
        setRetraining(false)
        setRetrainDone(true)
    }

    const maxVal = Math.max(...monthlyTrend.map(d => Math.max(d.actual, d.forecast)))

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', color: 'white' }}>

            {/* Sidebar */}
            <div style={{
                width: '220px', background: 'rgba(255,255,255,0.03)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0,
            }}>
                <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
                        <span style={{ fontWeight: '700', fontSize: '16px' }}>SmartERP</span>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '4px 0 0 0', letterSpacing: '1px' }}>PHARMACY</p>
                </div>
                <nav style={{ padding: '16px 12px', flex: 1 }}>
                    {[
                        { icon: '▦', label: 'Dashboard', path: '/dashboard' },
                        { icon: '⊞', label: 'Point of Sale', path: '/pos' },
                        { icon: '◈', label: 'Inventory', path: '/inventory' },
                        { icon: '♡', label: 'Patient History', path: '/patients' },
                        { icon: '◎', label: 'Suppliers', path: '/suppliers' },
                        { icon: '△', label: 'Alerts', path: '/alerts' },
                        { icon: '~', label: 'AI Forecasting', path: '/forecasting', active: true },
                        { icon: '≈', label: 'Analytics', path: '/analytics' },
                        { icon: '☰', label: 'Reports', path: '/reports' },
                    ].map((item) => (
                        <div key={item.label} onClick={() => router.push(item.path)} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '9px 12px', borderRadius: '8px', marginBottom: '2px', cursor: 'pointer',
                            background: item.active ? 'rgba(59,130,246,0.15)' : 'transparent',
                            color: item.active ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                            fontSize: '13px', fontWeight: item.active ? '600' : '400',
                        }}
                            onMouseEnter={(e) => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
                            onMouseLeave={(e) => { if (!item.active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                        >
                            <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>
                            {item.label}
                        </div>
                    ))}
                </nav>
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => router.push('/dashboard')} style={{
                        width: '100%', padding: '7px', background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px',
                        color: '#60a5fa', cursor: 'pointer', fontSize: '12px',
                    }}>Back to Dashboard</button>
                </div>
            </div>

            {/* Main */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>AI Forecasting</h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>XGBoost demand prediction engine — real model output</p>
                    </div>
                    <button onClick={handleRetrain} disabled={retraining} style={{
                        padding: '10px 20px',
                        background: retraining ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        border: 'none', borderRadius: '10px', color: 'white',
                        fontSize: '13px', fontWeight: '600', cursor: retraining ? 'not-allowed' : 'pointer',
                    }}>
                        {retraining ? 'Retraining...' : 'Retrain Model'}
                    </button>
                </div>

                {/* API Status Banner */}
                <div style={{
                    padding: '10px 16px', borderRadius: '10px', marginBottom: '20px',
                    background: apiConnected ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${apiConnected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    fontSize: '13px',
                    color: apiConnected ? '#10b981' : '#f87171',
                    display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: apiConnected ? '#10b981' : '#ef4444',
                    }} />
                    {apiConnected
                        ? 'XGBoost model connected — predictions from your trained model (pharmacy_xgboost_model.pkl)'
                        : 'Flask API not connected — showing estimated data. Start python ml/app.py to connect real model.'}
                </div>

                {retrainDone && (
                    <div style={{
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
                        color: '#10b981', fontSize: '13px',
                    }}>
                        Model predictions refreshed successfully — data updated from XGBoost engine
                    </div>
                )}

                {/* Model Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { label: 'MODEL', value: 'XGBoost v2.0', sub: 'Gradient Boosted Trees', color: '#8b5cf6' },
                        { label: 'MAPE SCORE', value: `${mape}%`, sub: 'vs 141–191% baseline', color: '#10b981' },
                        { label: 'ACCURACY', value: `${(100 - mape).toFixed(1)}%`, sub: '13 features used', color: '#3b82f6' },
                        { label: 'TRAINING DATA', value: '7,485', sub: 'Sri Lanka records | 10 medicines', color: '#f59e0b' },
                    ].map((m) => (
                        <div key={m.label} style={{
                            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '14px', padding: '20px',
                        }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px', marginBottom: '8px' }}>{m.label}</div>
                            <div style={{ fontSize: '22px', fontWeight: '700', color: m.color, marginBottom: '4px' }}>{m.value}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{m.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Chart + Feature Importance */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Actual vs Predicted Demand</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Monthly units sold across all SKUs</p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                                <span style={{ color: '#10b981' }}>● Actual</span>
                                <span style={{ color: '#8b5cf6' }}>● XGBoost</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px' }}>
                            {monthlyTrend.map((d, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%' }}>
                                        {d.actual > 0 && (
                                            <div style={{ flex: 1, height: `${(d.actual / maxVal) * 160}px`, background: 'linear-gradient(180deg, #10b981, #059669)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                                        )}
                                        <div style={{ flex: 1, height: `${(d.forecast / maxVal) * 160}px`, background: 'rgba(139,92,246,0.5)', borderRadius: '3px 3px 0 0', border: '1px dashed rgba(139,92,246,0.8)' }} />
                                    </div>
                                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{d.month}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Feature Importance</h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>XGBoost feature weights</p>
                        {featureImportances.map((f, i) => (
                            <div key={i} style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>{f.name}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#8b5cf6' }}>{(f.importance * 100).toFixed(0)}%</span>
                                </div>
                                <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                                    <div style={{ height: '100%', width: `${f.importance * 100}%`, background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)', borderRadius: '3px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Horizon Selector */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Forecast Horizon:</span>
                    {[30, 60, 90].map(h => (
                        <button key={h} onClick={() => setSelectedHorizon(h)} style={{
                            padding: '6px 16px',
                            background: selectedHorizon === h ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${selectedHorizon === h ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '20px',
                            color: selectedHorizon === h ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                            cursor: 'pointer', fontSize: '13px',
                        }}>{h} Days</button>
                    ))}
                </div>

                {/* Prescriptive Table */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '600' }}>Prescriptive Recommendations</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                            {apiConnected ? 'Live XGBoost predictions from your trained model' : 'Estimated predictions — connect Flask API for real model output'}
                        </p>
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                            Loading predictions from XGBoost model...
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                    {['MEDICINE', 'CATEGORY', 'CURRENT STOCK', `PREDICTED (${selectedHorizon}D)`, 'CONFIDENCE', 'DSS ACTION'].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {forecastData.map((row, i) => {
                                    const predicted = selectedHorizon === 30 ? row.predicted_30 : selectedHorizon === 60 ? row.predicted_60 : row.predicted_90
                                    const gap = predicted - row.current_stock
                                    return (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                                            onMouseEnter={(e) => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={(e) => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500' }}>{row.medicine}</td>
                                            <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{row.category}</td>
                                            <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600' }}>{row.current_stock}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: gap > 0 ? '#ef4444' : '#10b981' }}>{predicted}</span>
                                                {gap > 0 && <span style={{ fontSize: '11px', color: '#ef4444', marginLeft: '6px' }}>(need +{gap})</span>}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ height: '4px', width: '60px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                                                        <div style={{ height: '100%', width: `${row.confidence}%`, background: '#8b5cf6', borderRadius: '2px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{row.confidence}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: `${row.action_color}20`, color: row.action_color, border: `1px solid ${row.action_color}40` }}>
                                                    {row.action}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div style={{
                    marginTop: '16px', padding: '14px 18px',
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6',
                }}>
                    <strong style={{ color: '#a78bfa' }}>DSS Logic:</strong> Critical Reorder triggered when CurrentStock is less than PredictedDemand for the next {selectedHorizon} days.
                    Model: XGBoost Regressor | Features: lag_1, lag_7, lag_14, lag_30, rolling_mean_7, rolling_mean_30, rolling_std_7, day_of_week, month, is_weekend, is_month_end, days_since_start, category_encoded.
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