'use client'

import { useState, useEffect } from 'react'
import { useToast } from './Toast'
import { validateMedicineForm, validateBatchForm } from '@/lib/validations'

interface Supplier { id: string; name: string }
interface Medicine { id: string; name: string; sku: string; genericName: string | null; category: string; unitPrice: number; reorderPoint: number; scheduleType: string | null; supplierId: string | null }

const CATEGORIES = ['Antibiotic', 'Analgesic', 'Antidiabetic', 'Antihypertensive', 'Antiplatelet', 'Antilipemic', 'Antihistamine', 'Cardiovascular', 'Gastrointestinal', 'Respiratory', 'Other']
const SCHEDULE_TYPES = ['OTC', 'SCHEDULE_A', 'SCHEDULE_B', 'SCHEDULE_C']
const SCHEDULE_LABELS: Record<string, string> = { OTC: 'OTC — Over the Counter', SCHEDULE_A: 'Schedule A — Prescription Required', SCHEDULE_B: 'Schedule B — Pharmacist Only', SCHEDULE_C: 'Schedule C — Controlled Drug' }

const iStyle = { width: '100%', padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }
const errStyle = { fontSize: '11px', color: 'var(--danger)', marginTop: '3px' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '20px' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}

// ── Add Medicine Modal ────────────────────────────────────────────────────────
export function AddMedicineModal({ onClose, onSuccess, suppliers }: { onClose: () => void; onSuccess: () => void; suppliers: Supplier[] }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: '', genericName: '', sku: '', category: '', unitPrice: '', reorderPoint: '', scheduleType: 'OTC', supplierId: '', initialBatch: { batchNumber: '', quantity: '', expiryDate: '' } })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [addBatch, setAddBatch] = useState(false)

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  const setBatch = (field: string, value: string) => {
    setForm(prev => ({ ...prev, initialBatch: { ...prev.initialBatch, [field]: value } }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  const handleSubmit = async () => {
    setApiError('')
    const validation = validateMedicineForm({ ...form, unitPrice: Number(form.unitPrice), reorderPoint: Number(form.reorderPoint) })
    if (addBatch) {
      const batchValidation = validateBatchForm({ ...form.initialBatch, quantity: Number(form.initialBatch.quantity) })
      if (!batchValidation.valid) Object.assign(validation.errors, batchValidation.errors)
      if (!batchValidation.valid) validation.valid = false
    }
    if (!validation.valid) { setErrors(validation.errors); return }

    setLoading(true)
    try {
      const res = await fetch('/api/medicines', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, unitPrice: Number(form.unitPrice), reorderPoint: Number(form.reorderPoint), sku: form.sku.toUpperCase(), initialBatch: addBatch ? { ...form.initialBatch, quantity: Number(form.initialBatch.quantity) } : undefined }),
      })
      const data = await res.json()
      if (data.error) { if (data.errors) setErrors(data.errors); else setApiError(data.error); return }
      showToast('Medicine added successfully')
      onSuccess()
    } catch { setApiError('Failed to add medicine. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '28px', width: '540px', maxWidth: '95vw', boxShadow: 'var(--shadow-xl)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Add New Medicine</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Add a new medicine to the inventory catalogue</p>

        {apiError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--danger)' }}>{apiError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Medicine Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Amoxicillin 500mg" style={{ ...iStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.name && <p style={errStyle}>{errors.name}</p>}
          </div>
          <div>
            <label style={labelStyle}>SKU *</label>
            <input value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} placeholder="e.g. AMX-500MG" style={{ ...iStyle, borderColor: errors.sku ? 'var(--danger)' : 'var(--border-default)', fontFamily: 'monospace' }} />
            {errors.sku && <p style={errStyle}>{errors.sku}</p>}
          </div>
          <div>
            <label style={labelStyle}>Generic Name</label>
            <input value={form.genericName} onChange={e => set('genericName', e.target.value)} placeholder="e.g. Amoxicillin" style={{ ...iStyle, borderColor: errors.genericName ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.genericName && <p style={errStyle}>{errors.genericName}</p>}
          </div>
          <div>
            <label style={labelStyle}>Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={{ ...iStyle, borderColor: errors.category ? 'var(--danger)' : 'var(--border-default)' }}>
              <option value="">Select category...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p style={errStyle}>{errors.category}</p>}
          </div>
          <div>
            <label style={labelStyle}>Unit Price (LKR) *</label>
            <input value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} placeholder="0.00" type="number" min="0" step="0.01" style={{ ...iStyle, borderColor: errors.unitPrice ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.unitPrice && <p style={errStyle}>{errors.unitPrice}</p>}
          </div>
          <div>
            <label style={labelStyle}>Reorder Point *</label>
            <input value={form.reorderPoint} onChange={e => set('reorderPoint', e.target.value)} placeholder="e.g. 100" type="number" min="1" style={{ ...iStyle, borderColor: errors.reorderPoint ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.reorderPoint && <p style={errStyle}>{errors.reorderPoint}</p>}
          </div>
          <div>
            <label style={labelStyle}>Schedule Type *</label>
            <select value={form.scheduleType} onChange={e => set('scheduleType', e.target.value)} style={iStyle}>
              {SCHEDULE_TYPES.map(s => <option key={s} value={s}>{SCHEDULE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Supplier</label>
            <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)} style={iStyle}>
              <option value="">No supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Initial Batch */}
        <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: addBatch ? '14px' : '0' }} onClick={() => setAddBatch(!addBatch)}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${addBatch ? 'var(--brand-primary)' : 'var(--border-strong)'}`, background: addBatch ? 'var(--brand-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {addBatch && <span style={{ color: 'white', fontSize: '10px', fontWeight: '700' }}>✓</span>}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Add Initial Batch</span>
          </div>
          {addBatch && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Batch No. *</label>
                <input value={form.initialBatch.batchNumber} onChange={e => setBatch('batchNumber', e.target.value.toUpperCase())} placeholder="e.g. B2024-001" style={{ ...iStyle, borderColor: errors.batchNumber ? 'var(--danger)' : 'var(--border-default)', fontFamily: 'monospace' }} />
                {errors.batchNumber && <p style={errStyle}>{errors.batchNumber}</p>}
              </div>
              <div>
                <label style={labelStyle}>Quantity *</label>
                <input value={form.initialBatch.quantity} onChange={e => setBatch('quantity', e.target.value)} type="number" min="1" placeholder="e.g. 500" style={{ ...iStyle, borderColor: errors.quantity ? 'var(--danger)' : 'var(--border-default)' }} />
                {errors.quantity && <p style={errStyle}>{errors.quantity}</p>}
              </div>
              <div>
                <label style={labelStyle}>Expiry Date *</label>
                <input value={form.initialBatch.expiryDate} onChange={e => setBatch('expiryDate', e.target.value)} type="date" style={{ ...iStyle, borderColor: errors.expiryDate ? 'var(--danger)' : 'var(--border-default)' }} />
                {errors.expiryDate && <p style={errStyle}>{errors.expiryDate}</p>}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px', background: 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Adding...' : 'Add Medicine'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Edit Medicine Modal ───────────────────────────────────────────────────────
export function EditMedicineModal({ medicine, onClose, onSuccess, suppliers }: { medicine: Medicine; onClose: () => void; onSuccess: () => void; suppliers: Supplier[] }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: medicine.name, genericName: medicine.genericName ?? '', category: medicine.category, unitPrice: medicine.unitPrice.toString(), reorderPoint: medicine.reorderPoint.toString(), scheduleType: medicine.scheduleType ?? 'OTC', supplierId: medicine.supplierId ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  const handleSubmit = async () => {
    setApiError('')
    const validation = validateMedicineForm({ ...form, sku: medicine.sku, unitPrice: Number(form.unitPrice), reorderPoint: Number(form.reorderPoint) })
    if (!validation.valid) { setErrors(validation.errors); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/medicines/${medicine.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sku: medicine.sku, unitPrice: Number(form.unitPrice), reorderPoint: Number(form.reorderPoint) }),
      })
      const data = await res.json()
      if (data.error) { if (data.errors) setErrors(data.errors); else setApiError(data.error); return }
      showToast('Medicine updated successfully')
      onSuccess()
    } catch { setApiError('Failed to update medicine.') }
    finally { setLoading(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '28px', width: '500px', maxWidth: '95vw', boxShadow: 'var(--shadow-xl)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Edit Medicine</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>SKU <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--brand-primary)' }}>{medicine.sku}</span> cannot be changed</p>

        {apiError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--danger)' }}>{apiError}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Medicine Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={{ ...iStyle, borderColor: errors.name ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.name && <p style={errStyle}>{errors.name}</p>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Generic Name</label>
            <input value={form.genericName} onChange={e => set('genericName', e.target.value)} style={{ ...iStyle, borderColor: errors.genericName ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.genericName && <p style={errStyle}>{errors.genericName}</p>}
          </div>
          <div>
            <label style={labelStyle}>Category *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={iStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Schedule Type *</label>
            <select value={form.scheduleType} onChange={e => set('scheduleType', e.target.value)} style={iStyle}>
              {SCHEDULE_TYPES.map(s => <option key={s} value={s}>{SCHEDULE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Unit Price (LKR) *</label>
            <input value={form.unitPrice} onChange={e => set('unitPrice', e.target.value)} type="number" min="0" step="0.01" style={{ ...iStyle, borderColor: errors.unitPrice ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.unitPrice && <p style={errStyle}>{errors.unitPrice}</p>}
          </div>
          <div>
            <label style={labelStyle}>Reorder Point *</label>
            <input value={form.reorderPoint} onChange={e => set('reorderPoint', e.target.value)} type="number" min="1" style={{ ...iStyle, borderColor: errors.reorderPoint ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.reorderPoint && <p style={errStyle}>{errors.reorderPoint}</p>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Supplier</label>
            <select value={form.supplierId} onChange={e => set('supplierId', e.target.value)} style={iStyle}>
              <option value="">No supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px', background: 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Add Batch Modal ───────────────────────────────────────────────────────────
export function AddBatchModal({ medicineId, medicineName, onClose, onSuccess }: { medicineId: string; medicineName: string; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({ batchNumber: '', quantity: '', expiryDate: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  const handleSubmit = async () => {
    setApiError('')
    const validation = validateBatchForm({ ...form, quantity: Number(form.quantity) })
    if (!validation.valid) { setErrors(validation.errors); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/medicines/${medicineId}/batches`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, batchNumber: form.batchNumber.toUpperCase(), quantity: Number(form.quantity) }),
      })
      const data = await res.json()
      if (data.error) { if (data.errors) setErrors(data.errors); else setApiError(data.error); return }
      showToast('Batch added successfully')
      onSuccess()
    } catch { setApiError('Failed to add batch.') }
    finally { setLoading(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: '28px', width: '420px', maxWidth: '95vw', boxShadow: 'var(--shadow-xl)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>Add Batch</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Adding stock to <strong>{medicineName}</strong></p>

        {apiError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--danger)' }}>{apiError}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Batch Number *</label>
            <input value={form.batchNumber} onChange={e => set('batchNumber', e.target.value.toUpperCase())} placeholder="e.g. B2024-001" style={{ ...iStyle, borderColor: errors.batchNumber ? 'var(--danger)' : 'var(--border-default)', fontFamily: 'monospace' }} />
            {errors.batchNumber && <p style={errStyle}>{errors.batchNumber}</p>}
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>Format: uppercase letters, numbers and hyphens</p>
          </div>
          <div>
            <label style={labelStyle}>Quantity *</label>
            <input value={form.quantity} onChange={e => set('quantity', e.target.value)} type="number" min="1" placeholder="e.g. 500" style={{ ...iStyle, borderColor: errors.quantity ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.quantity && <p style={errStyle}>{errors.quantity}</p>}
          </div>
          <div>
            <label style={labelStyle}>Expiry Date *</label>
            <input value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} type="date" style={{ ...iStyle, borderColor: errors.expiryDate ? 'var(--danger)' : 'var(--border-default)' }} />
            {errors.expiryDate && <p style={errStyle}>{errors.expiryDate}</p>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px', background: 'var(--brand-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Adding...' : 'Add Batch'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
export function DeleteMedicineModal({ medicineId, medicineName, onClose, onSuccess }: { medicineId: string; medicineName: string; onClose: () => void; onSuccess: () => void }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/medicines/${medicineId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      showToast('Medicine deleted successfully', 'success')
      onSuccess()
    } catch { setError('Failed to delete medicine.') }
    finally { setLoading(false) }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-xl)', padding: '28px', width: '400px', maxWidth: '95vw', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', margin: '0 auto 12px' }}>🗑</div>
          <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>Delete Medicine</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>Are you sure you want to delete <strong>{medicineName}</strong>? This will also delete all associated batches.</p>
        </div>

        {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--danger)' }}>{error}</div>}

        <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--warning)' }}>
          ⚠ Medicines with sales history cannot be deleted
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleDelete} disabled={loading} style={{ flex: 1, padding: '10px', background: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-md)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Deleting...' : 'Delete Medicine'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}