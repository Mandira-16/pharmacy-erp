'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AppLayout from '../../components/AppLayout'
import { useToast } from '../../components/Toast'

interface Patient { id: string; name: string; nic: string | null; phone: string | null; email: string | null; consentFlag: boolean; consentExpiresAt?: string | null }
interface HistoryRecord { id: string; date: string; medicineName: string; quantity: number | null; doctorName: string | null; doctorSlmc: string | null; notes: string | null }
interface PatientDetail { patient: Patient; history: HistoryRecord[] }

export default function PatientsPage() {
  const { status } = useSession()
  const router = useRouter()
  const { showToast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Consent flow
  const [requestingConsent, setRequestingConsent] = useState<string | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [otpPatientId, setOtpPatientId] = useState<string | null>(null)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [consentMsg, setConsentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchPatients = () => {
    fetch('/api/patients').then(r => r.json()).then(d => { if (d.error) throw new Error(d.error); setPatients(d.patients ?? []) }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }

  useEffect(() => { if (status !== 'authenticated') return; fetchPatients() }, [status])

  const selectPatient = async (patient: Patient) => {
    if (!patient.consentFlag) { setSelected({ patient, history: [] }); return }
    try {
      const res = await fetch(`/api/patients/${patient.id}`)
      const data = await res.json()
      setSelected({ patient, history: data.history ?? [] })
    } catch { setSelected({ patient, history: [] }) }
  }

  const requestConsent = async (patientId: string) => {
    setRequestingConsent(patientId)
    setConsentMsg(null)
    try {
      const res = await fetch('/api/patients/request-consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOtpPatientId(patientId)
      showToast("OTP sent to patient's email", 'success')
      setConsentMsg({ type: 'success', text: `OTP sent to patient's email. Ask the patient for the code.` })
    } catch (e: any) { setConsentMsg({ type: 'error', text: e.message }) }
    finally { setRequestingConsent(null) }
  }

  const verifyConsent = async () => {
    if (!otpPatientId || !otpInput) return
    setVerifyingOtp(true)
    setConsentMsg(null)
    try {
      const res = await fetch('/api/patients/verify-consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientId: otpPatientId, otp: otpInput }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const expiresAt = new Date(data.expiresAt).toLocaleDateString('en-LK')
      showToast(`✓ Consent granted — access valid until ${expiresAt}`, 'success')
      setConsentMsg({ type: 'success', text: `✓ Consent granted! Access valid until ${expiresAt}` })
      setOtpInput(''); setOtpPatientId(null)
      fetchPatients()
      // Reload selected patient
      if (selected?.patient.id === otpPatientId) {
        const refreshed = await fetch(`/api/patients/${otpPatientId}`).then(r => r.json())
        setSelected({ patient: { ...selected.patient, consentFlag: true, consentExpiresAt: data.expiresAt }, history: refreshed.history ?? [] })
      }
    } catch (e: any) { setConsentMsg({ type: 'error', text: e.message }) }
    finally { setVerifyingOtp(false) }
  }

  const filtered = patients.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.nic ?? '').includes(search))

  const iStyle = { width: '100%', padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }

  if (status === 'loading' || loading) return <AppLayout><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}><div style={{ width: '28px', height: '28px', border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /><span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Loading records...</span></div></AppLayout>

  return (
    <AppLayout>
      <div style={{ padding: '28px 32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.4px', marginBottom: '3px' }}>Patient Records</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>PDPA-compliant medication history · OTP consent · 10-day access window</p>
        </div>

        {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: 'var(--danger)', fontSize: '13px' }}>⚠ {error}</div>}

        {consentMsg && (
          <div style={{ background: consentMsg.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${consentMsg.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`, borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', color: consentMsg.type === 'success' ? 'var(--success)' : 'var(--danger)', fontSize: '13px', fontWeight: '500' }}>
            {consentMsg.text}
          </div>
        )}

        {/* OTP Entry */}
        {otpPatientId && (
          <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Enter Patient OTP</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '14px' }}>Ask the patient for the 6-digit code sent to their email. Valid for 15 minutes.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') verifyConsent() }}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                autoFocus
                style={{ ...iStyle, flex: 1, letterSpacing: '4px', fontSize: '18px', fontWeight: '700', textAlign: 'center', fontFamily: 'monospace' }}
              />
              <button onClick={verifyConsent} disabled={otpInput.length !== 6 || verifyingOtp} style={{ padding: '10px 20px', background: otpInput.length === 6 ? 'var(--brand-primary)' : 'var(--bg-surface-3)', border: 'none', borderRadius: 'var(--radius-md)', color: otpInput.length === 6 ? 'white' : 'var(--text-tertiary)', fontWeight: '700', fontSize: '13px', cursor: otpInput.length === 6 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                {verifyingOtp ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button onClick={() => { setOtpPatientId(null); setOtpInput('') }} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
          {/* Patient list */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or NIC..." style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>No patients found</div>
            ) : (
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
                {filtered.map(p => {
                  const isExpired = p.consentExpiresAt && new Date(p.consentExpiresAt) < new Date()
                  const effectiveConsent = p.consentFlag && !isExpired
                  return (
                    <div key={p.id} onClick={() => selectPatient(p)}
                      style={{ padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', background: selected?.patient.id === p.id ? 'var(--brand-primary-light)' : 'transparent', borderLeft: selected?.patient.id === p.id ? '3px solid var(--brand-primary)' : '3px solid transparent', transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (selected?.patient.id !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface-2)' }}
                      onMouseLeave={e => { if (selected?.patient.id !== p.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `hsl(${p.name.charCodeAt(0) * 10}, 60%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: 'white', flexShrink: 0 }}>{p.name[0]}</div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: selected?.patient.id === p.id ? 'var(--brand-primary)' : 'var(--text-primary)' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{p.nic ?? 'No NIC'}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '20px', flexShrink: 0, background: effectiveConsent ? 'var(--success-bg)' : isExpired ? 'var(--warning-bg)' : 'var(--danger-bg)', color: effectiveConsent ? 'var(--success)' : isExpired ? 'var(--warning)' : 'var(--danger)', border: `1px solid ${effectiveConsent ? 'var(--success-border)' : isExpired ? 'var(--warning-border)' : 'var(--danger-border)'}` }}>
                          {effectiveConsent ? 'Active' : isExpired ? 'Expired' : 'No Consent'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {!selected ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px', color: 'var(--text-tertiary)' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>♡</div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Select a patient</p>
                <p style={{ fontSize: '12px' }}>Click a patient from the list to view their records</p>
              </div>
            ) : (() => {
              const isExpired = selected.patient.consentExpiresAt && new Date(selected.patient.consentExpiresAt) < new Date()
              const effectiveConsent = selected.patient.consentFlag && !isExpired
              return (
                <>
                  {/* Patient header */}
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `hsl(${selected.patient.name.charCodeAt(0) * 10}, 60%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: 'white' }}>{selected.patient.name[0]}</div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>{selected.patient.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                          {selected.patient.nic && <span>NIC: {selected.patient.nic} · </span>}
                          {selected.patient.phone && <span>📞 {selected.patient.phone}</span>}
                          {selected.patient.email && <span> · ✉ {selected.patient.email}</span>}
                        </div>
                        {effectiveConsent && selected.patient.consentExpiresAt && (
                          <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '3px', fontWeight: '500' }}>
                            Access expires: {new Date(selected.patient.consentExpiresAt).toLocaleDateString('en-LK')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {!effectiveConsent && (
                        <button
                          onClick={() => requestConsent(selected.patient.id)}
                          disabled={!selected.patient.email || requestingConsent === selected.patient.id}
                          title={!selected.patient.email ? 'Patient has no email — cannot send OTP' : ''}
                          style={{ padding: '8px 16px', background: selected.patient.email ? 'var(--brand-primary)' : 'var(--bg-surface-3)', border: 'none', borderRadius: 'var(--radius-md)', color: selected.patient.email ? 'white' : 'var(--text-tertiary)', fontSize: '12px', fontWeight: '600', cursor: selected.patient.email ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                          {requestingConsent === selected.patient.id ? 'Sending...' : isExpired ? '🔁 Re-request Consent' : '📧 Request Consent'}
                        </button>
                      )}
                      <span style={{ fontSize: '11px', fontWeight: '700', padding: '5px 12px', borderRadius: '20px', background: effectiveConsent ? 'var(--success-bg)' : isExpired ? 'var(--warning-bg)' : 'var(--danger-bg)', color: effectiveConsent ? 'var(--success)' : isExpired ? 'var(--warning)' : 'var(--danger)', border: `1px solid ${effectiveConsent ? 'var(--success-border)' : isExpired ? 'var(--warning-border)' : 'var(--danger-border)'}` }}>
                        {effectiveConsent ? '✓ Consent Active' : isExpired ? '⏰ Consent Expired' : '🔒 No Consent'}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '20px 24px' }}>
                    {!effectiveConsent ? (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                        <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                          {isExpired ? 'Consent Has Expired' : 'Access Restricted'}
                        </p>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '360px', margin: '0 auto 20px', lineHeight: '1.7' }}>
                          {isExpired
                            ? `${selected.patient.name}'s 10-day consent window has expired. Request consent again to regain access.`
                            : `${selected.patient.name} has not granted PDPA consent. Click "Request Consent" to send an OTP to their email.`}
                        </p>
                        {!selected.patient.email && (
                          <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '12px', color: 'var(--warning)', maxWidth: '360px', margin: '0 auto' }}>
                            ⚠ No email registered — update patient email to enable OTP consent
                          </div>
                        )}
                        <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '12px', color: 'var(--info)', maxWidth: '360px', margin: '16px auto 0', lineHeight: '1.6' }}>
                          🔒 PDPA Compliance: Access requires explicit patient consent via OTP. Consent is valid for 10 days. The patient can revoke access at any time via email link.
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Medication History</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>{selected.history.length} records found</p>
                        {selected.history.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-tertiary)', fontSize: '13px' }}>No medication history recorded yet</div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: 'var(--bg-surface-2)' }}>
                                  {['Date', 'Medicine', 'Qty', 'Doctor', 'SLMC', 'Notes'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', letterSpacing: '0.5px', textTransform: 'uppercase' as const, borderBottom: '1px solid var(--border-default)', whiteSpace: 'nowrap' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {selected.history.map((rec, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-surface-2)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                                  >
                                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(rec.date).toLocaleDateString('en-LK')}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{rec.medicineName}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>{rec.quantity ?? '—'}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{rec.doctorName ? `Dr. ${rec.doctorName}` : '—'}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{rec.doctorSlmc ?? '—'}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-tertiary)' }}>{rec.notes ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}