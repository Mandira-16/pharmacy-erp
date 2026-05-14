'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { AddMedicineModal, EditMedicineModal, AddBatchModal, DeleteMedicineModal } from '../../components/InventoryModals'

interface Medicine { id: string; sku: string; name: string; genericName: string | null; category: string; batchNumber: string; totalStock: number; reorderPoint: number; expiryDate: string | null; daysToExpiry: number | null; unitPrice: number; status: string; supplier: string }
interface KPIs { totalSKUs: number; totalValue: number; lowStockCount: number; expiring90: number; expiring30: number; categories: number; suppliers: number }

const statusColors: Record<string, string> = { 'In Stock': '#10b981', 'Low Stock': '#f59e0b', 'Critical': '#ef4444', 'Out of Stock': '#ef4444' }

function formatLKR(n: number) { if (n >= 1000000) return `LKR ${(n / 1000000).toFixed(2)}M`; if (n >= 1000) return `LKR ${(n / 1000).toFixed(1)}K`; return `LKR ${n.toFixed(0)}` }

export default function InventoryPage() {
  const { status } = useSession()
  const router = useRouter()

  // ── Inventory data ──────────────────────────────────────────────────────────
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  // ── CRUD modal state ────────────────────────────────────────────────────────
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null)
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  // ── Fetch inventory ─────────────────────────────────────────────────────────
  const fetchInventory = () => {
    setLoading(true)
    fetch('/api/inventory')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setMedicines(d.medicines ?? [])
        setKpis(d.kpis)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (status === 'authenticated') fetchInventory() }, [status])

  // ── Fetch suppliers for modal dropdown ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/suppliers')
      .then(r => r.json())
      .then(data => setSuppliers(data.suppliers.map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(console.error)
  }, [])

  // ── Filtered medicines ──────────────────────────────────────────────────────
  const categories = ['all', ...Array.from(new Set(medicines.map(m => m.category))).sort()]
  const filtered = medicines.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.sku.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || m.status === filterStatus
    const matchCat = filterCategory === 'all' || m.category === filterCategory
    return matchSearch && matchStatus && matchCat
  })

  // ── Loading state ───────────────────────────────────────────────────────────
  if (status === 'loading' || loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
        <div style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading inventory...</span>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px' }}>

        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Inventory</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Batch-level stock tracking · Expiry monitoring · Reorder alerts</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setSelectedMedicine(null); setModalMode('add') }}
              style={{ fontSize: '12px', padding: '8px 16px', background: 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', boxShadow: 'var(--shadow-sm)' }}
            >
              + Add Medicine
            </button>
            <button
              onClick={fetchInventory}
              style={{ fontSize: '12px', padding: '8px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '500', boxShadow: 'var(--shadow-sm)' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* ── Error Banner ──────────────────────────────────────────────────── */}
        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--danger)', fontSize: '13px' }}>
            ⚠ {error}
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Medicines', value: kpis?.totalSKUs.toString() ?? '0', color: '#2563eb' },
            { label: 'Total Value', value: kpis ? formatLKR(kpis.totalValue) : 'LKR 0', color: '#10b981' },
            { label: 'Low Stock', value: kpis?.lowStockCount.toString() ?? '0', color: '#f59e0b' },
            { label: 'Expiring (90 days)', value: kpis?.expiring90.toString() ?? '0', color: '#ef4444' },
            { label: 'Categories', value: kpis?.categories.toString() ?? '0', color: '#8b5cf6' },
            { label: 'Suppliers', value: kpis?.suppliers.toString() ?? '0', color: '#06b6d4' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>{k.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medicine or SKU..."
            style={{ flex: 1, minWidth: '200px', padding: '9px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxShadow: 'var(--shadow-sm)' }}
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '9px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', outline: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
            <option value="all">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Critical">Critical</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '9px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', outline: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          <span style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '500' }}>
            {filtered.length} of {medicines.length}
          </span>
        </div>

        {/* ── Inventory Table ────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Medicine Inventory</h3>
            {kpis && kpis.expiring30 > 0 && (
              <span style={{ fontSize: '12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                ⚠ {kpis.expiring30} expiring within 30 days
              </span>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-2)' }}>
                  {['SKU', 'Medicine', 'Category', 'Batch', 'Stock', 'ROP', 'Expiry', 'Unit Price', 'Supplier', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                      No medicines match your filters
                    </td>
                  </tr>
                ) : filtered.map(med => {
                  const expiryColor = med.daysToExpiry !== null
                    ? med.daysToExpiry <= 30 ? 'var(--danger)'
                      : med.daysToExpiry <= 60 ? '#f97316'
                        : med.daysToExpiry <= 90 ? 'var(--warning)'
                          : 'var(--text-secondary)'
                    : 'var(--text-secondary)'
                  return (
                    <tr
                      key={med.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-surface-2)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '13px 16px', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{med.sku}</td>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{med.name}</div>
                        {med.genericName && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{med.genericName}</div>}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{med.category}</td>
                      <td style={{ padding: '13px 16px', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{med.batchNumber}</td>
                      <td style={{ padding: '13px 16px', fontSize: '13px', fontWeight: '700', color: med.totalStock <= med.reorderPoint ? 'var(--danger)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>{med.totalStock}</td>
                      <td style={{ padding: '13px 16px', fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{med.reorderPoint}</td>
                      <td style={{ padding: '13px 16px', fontSize: '12px', color: expiryColor, whiteSpace: 'nowrap' }}>
                        {med.expiryDate ?? '—'}
                        {med.daysToExpiry !== null && med.daysToExpiry <= 90 && (
                          <span style={{ marginLeft: '4px', fontSize: '10px' }}>({med.daysToExpiry}d)</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>LKR {med.unitPrice.toFixed(2)}</td>
                      <td style={{ padding: '13px 16px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{med.supplier}</td>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: `${statusColors[med.status] ?? '#6b7280'}12`, color: statusColors[med.status] ?? '#6b7280', border: `1px solid ${statusColors[med.status] ?? '#6b7280'}25` }}>
                          {med.status}
                        </span>
                      </td>

                      {/* ── Action Buttons ──────────────────────────────────── */}
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => { setSelectedMedicine(med); setModalMode('edit') }}
                            title="Edit medicine"
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                          >
                            ✏ Edit
                          </button>
                          <button
                            onClick={() => { setSelectedMedicine(med); setShowBatchModal(true) }}
                            title="Add new batch"
                            style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                          >
                            + Batch
                          </button>
                          <button
                            onClick={() => { setSelectedMedicine(med); setShowDeleteModal(true) }}
                            title="Delete medicine"
                            style={{ padding: '4px 8px', fontSize: '11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', color: '#ef4444', fontFamily: 'inherit' }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── CRUD Modals ─────────────────────────────────────────────────────── */}
      {modalMode === 'add' && (
        <AddMedicineModal
          suppliers={suppliers}
          onClose={() => setModalMode(null)}
          onSuccess={fetchInventory}
        />
      )}
      {modalMode === 'edit' && selectedMedicine && (
        <EditMedicineModal
          medicine={selectedMedicine}
          suppliers={suppliers}
          onClose={() => setModalMode(null)}
          onSuccess={fetchInventory}
        />
      )}
      {showBatchModal && selectedMedicine && (
        <AddBatchModal
          medicineId={selectedMedicine.id}
          medicineName={selectedMedicine.name}
          onClose={() => setShowBatchModal(false)}
          onSuccess={fetchInventory}
        />
      )}
      {showDeleteModal && selectedMedicine && (
        <DeleteMedicineModal
          medicineId={selectedMedicine.id}
          medicineName={selectedMedicine.name}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={fetchInventory}
        />
      )}

    </AppLayout>
  )
}