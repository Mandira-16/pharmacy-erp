'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  { icon: '▦', label: 'Dashboard', path: '/dashboard' },
  { icon: '⊞', label: 'Point of Sale', path: '/pos' },
  { icon: '◈', label: 'Inventory', path: '/inventory', active: true },
  { icon: '♡', label: 'Patient History', path: '/patients' },
  { icon: '◎', label: 'Suppliers', path: '/suppliers' },
  { icon: '△', label: 'Alerts', path: '/alerts' },
  { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
  { icon: '⚡', label: 'DSS', path: '/dss' },
  { icon: '≈', label: 'Analytics', path: '/analytics' },
  { icon: '☰', label: 'Reports', path: '/reports' },
]

interface Medicine {
  id: string; sku: string; name: string; genericName: string | null
  category: string; batchNumber: string; totalStock: number
  reorderPoint: number; expiryDate: string | null; daysToExpiry: number | null
  unitPrice: number; status: string; supplier: string; batchCount: number
}

interface KPIs {
  totalSKUs: number; totalValue: number; lowStockCount: number
  expiring90: number; expiring30: number; categories: number; suppliers: number
}

const statusColor: Record<string, string> = {
  'In Stock': '#10b981',
  'Low Stock': '#f59e0b',
  'Critical': '#ef4444',
  'Out of Stock': '#ef4444',
}

function formatLKR(n: number) {
  if (n >= 1000000) return `LKR ${(n / 1000000).toFixed(2)}M`
  if (n >= 1000) return `LKR ${(n / 1000).toFixed(1)}K`
  return `LKR ${n.toFixed(0)}`
}

export default function InventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchInventory = () => {
    setLoading(true)
    fetch('/api/inventory')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setMedicines(d.medicines ?? []); setKpis(d.kpis) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (status === 'authenticated') fetchInventory() }, [status])

  const categories = ['all', ...Array.from(new Set(medicines.map(m => m.category))).sort()]

  const filtered = medicines.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.sku.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || m.status === filterStatus
    const matchCat = filterCategory === 'all' || m.category === filterCategory
    return matchSearch && matchStatus && matchCat
  })

  if (status === 'loading' || loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        Loading inventory...
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
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Inventory Management</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Batch-level tracking · FEFO · ROP monitoring · Live from PostgreSQL</p>
          </div>
          <button onClick={fetchInventory} style={{ fontSize: '12px', padding: '7px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>↻ Refresh</button>
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '13px' }}>⚠ {error}</div>}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'TOTAL SKUs', value: kpis?.totalSKUs.toString() ?? '0', color: '#3b82f6' },
            { label: 'TOTAL VALUE', value: kpis ? formatLKR(kpis.totalValue) : 'LKR 0', color: '#10b981' },
            { label: 'LOW STOCK', value: kpis?.lowStockCount.toString() ?? '0', color: '#f59e0b' },
            { label: 'EXPIRING (90D)', value: kpis?.expiring90.toString() ?? '0', color: '#ef4444' },
            { label: 'CATEGORIES', value: kpis?.categories.toString() ?? '0', color: '#8b5cf6' },
            { label: 'SUPPLIERS', value: kpis?.suppliers.toString() ?? '0', color: '#06b6d4' },
          ].map(k => (
            <div key={k.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px 20px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px', marginBottom: '8px' }}>{k.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search medicine, SKU, category..."
            style={{ flex: 1, minWidth: '200px', padding: '9px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '9px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
            <option value="all">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Critical">Critical</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            style={{ padding: '9px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            {filtered.length} of {medicines.length} items
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Medicine Inventory</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {kpis && kpis.expiring30 > 0 && (
                <span style={{ fontSize: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '4px 10px', borderRadius: '20px' }}>
                  ⚠ {kpis.expiring30} expiring in 30 days
                </span>
              )}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['SKU', 'MEDICINE', 'CATEGORY', 'BATCH', 'STOCK', 'ROP', 'EXPIRY', 'UNIT PRICE', 'SUPPLIER', 'STATUS'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '600', letterSpacing: '0.5px', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
                      {medicines.length === 0 ? 'No medicines in database — run npx prisma db seed' : 'No medicines match your filters'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((med) => {
                    const expiryWarning = med.daysToExpiry !== null && med.daysToExpiry <= 90
                    const expiryColor = med.daysToExpiry !== null
                      ? med.daysToExpiry <= 30 ? '#ef4444'
                      : med.daysToExpiry <= 60 ? '#f97316'
                      : med.daysToExpiry <= 90 ? '#f59e0b'
                      : 'rgba(255,255,255,0.5)'
                      : 'rgba(255,255,255,0.5)'
                    return (
                      <tr key={med.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{med.sku}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                          {med.name}
                          {med.genericName && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>{med.genericName}</div>}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{med.category}</td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{med.batchNumber}</td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: med.totalStock <= med.reorderPoint ? '#ef4444' : 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>{med.totalStock}</td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{med.reorderPoint}</td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: expiryColor, whiteSpace: 'nowrap' }}>
                          {med.expiryDate ?? '—'}
                          {expiryWarning && med.daysToExpiry !== null && (
                            <span style={{ marginLeft: '4px', fontSize: '10px' }}>({med.daysToExpiry}d)</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>LKR {med.unitPrice.toFixed(2)}</td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{med.supplier}</td>
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: `${statusColor[med.status] ?? '#6b7280'}20`, color: statusColor[med.status] ?? '#6b7280', border: `1px solid ${statusColor[med.status] ?? '#6b7280'}40` }}>
                            {med.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}@keyframes spin{to{transform:rotate(360deg)}}input::placeholder{color:rgba(255,255,255,0.2)}select option{background:#0f172a}`}</style>
    </div>
  )
}