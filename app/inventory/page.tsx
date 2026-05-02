'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const medicines = [
  { sku: 'MED001', name: 'Amoxicillin 500mg', category: 'Antibiotic', batch: 'B2024-154', stock: 580, rop: 200, expiry: '2025-08-15', unitPrice: 45.00, status: 'In Stock' },
  { sku: 'MED002', name: 'Paracetamol 500mg', category: 'Analgesic', batch: 'B2024-289', stock: 1200, rop: 500, expiry: '2026-03-20', unitPrice: 12.50, status: 'In Stock' },
  { sku: 'MED003', name: 'Metformin 850mg', category: 'Antidiabetic', batch: 'B2024-489', stock: 120, rop: 300, expiry: '2025-09-10', unitPrice: 35.00, status: 'Low Stock' },
  { sku: 'MED004', name: 'Losartan 50mg', category: 'Cardiovascular', batch: 'B2024-145', stock: 450, rop: 150, expiry: '2026-01-25', unitPrice: 65.00, status: 'In Stock' },
  { sku: 'MED005', name: 'Omeprazole 20mg', category: 'Gastrointestinal', batch: 'B2024-178', stock: 80, rop: 250, expiry: '2025-04-18', unitPrice: 28.50, status: 'Critical' },
  { sku: 'MED006', name: 'Atorvastatin 20mg', category: 'Cardiovascular', batch: 'B2024-201', stock: 320, rop: 150, expiry: '2026-05-30', unitPrice: 55.00, status: 'In Stock' },
  { sku: 'MED007', name: 'Salbutamol Inhaler', category: 'Respiratory', batch: 'B2024-333', stock: 95, rop: 100, expiry: '2025-12-01', unitPrice: 320.00, status: 'Low Stock' },
  { sku: 'MED008', name: 'Ciprofloxacin 500mg', category: 'Antibiotic', batch: 'B2024-412', stock: 210, rop: 120, expiry: '2025-05-22', unitPrice: 48.00, status: 'In Stock' },
]

const statusColor: Record<string, string> = {
  'In Stock': '#10b981',
  'Low Stock': '#f59e0b',
  'Critical': '#ef4444',
}

export default function InventoryPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  const totalValue = medicines.reduce((sum, m) => sum + m.stock * m.unitPrice, 0)
  const lowStock = medicines.filter(m => m.status === 'Low Stock' || m.status === 'Critical').length
  const expiringSoon = medicines.filter(m => {
    const days = Math.ceil((new Date(m.expiry).getTime() - Date.now()) / 86400000)
    return days <= 90
  }).length

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
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</div>
            <span style={{ fontWeight: '700', fontSize: '16px' }}>SmartERP</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', margin: '4px 0 0 0', letterSpacing: '1px' }}>PHARMACY</p>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {[
            { icon: '▦', label: 'Dashboard', path: '/dashboard' },
            { icon: '⊞', label: 'Point of Sale', path: '/pos' },
            { icon: '◈', label: 'Inventory', path: '/inventory', active: true },
            { icon: '♡', label: 'Patient History', path: '/patients' },
            { icon: '◎', label: 'Suppliers', path: '/suppliers' },
            { icon: '△', label: 'Alerts', path: '/alerts' },
            { icon: '~', label: 'AI Forecasting', path: '/forecasting' },
            { icon: '≈', label: 'Analytics', path: '/analytics' },
            { icon: '☰', label: 'Reports', path: '/reports' },
          ].map((item) => (
            <div
              key={item.label}
              onClick={() => router.push(item.path)}
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

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              width: '100%', padding: '7px',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '6px', color: '#60a5fa',
              cursor: 'pointer', fontSize: '12px',
            }}
          >Back to Dashboard</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0' }}>Inventory Management</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>Batch-level tracking with ROP monitoring</p>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'TOTAL SKUs', value: medicines.length.toString(), color: '#3b82f6' },
            { label: 'TOTAL VALUE', value: `LKR ${(totalValue / 1000).toFixed(0)}K`, color: '#10b981' },
            { label: 'LOW STOCK ITEMS', value: lowStock.toString(), color: '#f59e0b' },
            { label: 'EXPIRING (90D)', value: expiringSoon.toString(), color: '#ef4444' },
            { label: 'CATEGORIES', value: '8', color: '#8b5cf6' },
            { label: 'SUPPLIERS', value: '12', color: '#06b6d4' },
          ].map((k) => (
            <div key={k.label} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
              padding: '18px 20px',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px', marginBottom: '8px' }}>{k.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Medicine Inventory</h3>
            <button style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none', borderRadius: '8px',
              color: 'white', fontSize: '13px',
              cursor: 'pointer', fontWeight: '500',
            }}>+ Add Medicine</button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['SKU', 'MEDICINE', 'CATEGORY', 'BATCH', 'STOCK', 'ROP', 'EXPIRY', 'UNIT PRICE', 'STATUS'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.35)',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicines.map((med, i) => {
                const daysToExpiry = Math.ceil((new Date(med.expiry).getTime() - Date.now()) / 86400000)
                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{med.sku}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '500' }}>{med.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{med.category}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{med.batch}</td>
                    <td style={{
                      padding: '14px 16px', fontSize: '13px', fontWeight: '600',
                      color: med.stock <= med.rop ? '#ef4444' : 'rgba(255,255,255,0.8)',
                    }}>{med.stock}</td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{med.rop}</td>
                    <td style={{
                      padding: '14px 16px', fontSize: '12px',
                      color: daysToExpiry <= 30 ? '#ef4444' : daysToExpiry <= 90 ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                    }}>{med.expiry} {daysToExpiry <= 90 && <span style={{ fontSize: '10px' }}>({daysToExpiry}d)</span>}</td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>LKR {med.unitPrice.toFixed(2)}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: `${statusColor[med.status]}20`,
                        color: statusColor[med.status],
                        border: `1px solid ${statusColor[med.status]}40`,
                      }}>{med.status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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