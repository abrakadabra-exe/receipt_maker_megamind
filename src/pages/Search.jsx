import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { backend } from '../lib/store'
import { decryptToBlob, openBlob, downloadBlob } from '../lib/invoiceCrypto'
import { bdt } from '../lib/money'
import { TYPES } from '../lib/numbers'
import { Btn, Field, inputCls, Card, Badge, SectionTitle, ErrorBox } from '../components/ui'

export default function Search() {
  const navigate = useNavigate()
  const location = useLocation()
  const [number, setNumber] = useState('')
  const [type, setType] = useState('')
  const [client, setClient] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [payInvoice, setPayInvoice] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [payDetail, setPayDetail] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [cnInvoice, setCnInvoice] = useState(null)
  const [cnAmount, setCnAmount] = useState('')
  const [cnReason, setCnReason] = useState('')
  const [cnDate, setCnDate] = useState(new Date().toISOString().slice(0, 10))

  async function run(filters = {}) {
    setError('')
    try {
      const list = await backend.queryInvoices({
        number: filters.number ?? number,
        type: filters.type ?? type,
        client: filters.client ?? client,
        from: filters.from ?? from,
        to: filters.to ?? to,
      })
      setRows(list)
    } catch (err) {
      setError(err.message || 'Search failed')
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    const clientFilter = location.state?.client || ''
    if (clientFilter) setClient(clientFilter)
    run({ number: '', type: '', client: clientFilter, from: '', to: '' })
    window.history.replaceState({}, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fmtDate(d) {
    if (!d) return '—'
    const dt = new Date(`${d}T00:00:00`)
    return Number.isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  async function view(id) {
    setBusyId(id)
    setError('')
    try {
      const rec = await backend.getInvoice(id)
      if (!rec) throw new Error('Invoice not found')
      const blob = await decryptToBlob(rec.blob)
      openBlob(blob)
    } catch (err) {
      setError(err.message || 'Could not open invoice')
    } finally {
      setBusyId(null)
    }
  }

  async function download(id) {
    setBusyId(id)
    setError('')
    try {
      const rec = await backend.getInvoice(id)
      if (!rec) throw new Error('Invoice not found')
      const blob = await decryptToBlob(rec.blob)
      downloadBlob(blob, `${rec.meta.number}.pdf`)
    } catch (err) {
      setError(err.message || 'Could not download invoice')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this invoice permanently? This cannot be undone.')) return
    setError('')
    try {
      await backend.deleteInvoice(id)
      setRows((p) => p.filter((r) => r.id !== id))
    } catch (err) {
      setError(err.message || 'Could not delete invoice')
    }
  }

  async function cancel(id) {
    if (!window.confirm('Cancel this invoice? A CANCELLED stamp will be shown and it will be excluded from earnings.')) return
    setError('')
    try {
      await backend.cancelInvoice(id)
      setRows((p) => p.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)))
    } catch (err) {
      setError(err.message || 'Could not cancel invoice')
    }
  }

  async function recordPayment() {
    if (!payInvoice) return
    const amt = Number(payAmount)
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    setError('')
    try {
      const status = await backend.addPayment(payInvoice.id, { amount: amt, method: payMethod, detail: payDetail, date: payDate })
      setRows((p) => p.map((r) => (r.id === payInvoice.id ? { ...r, paymentStatus: status } : r)))
      setPayInvoice(null)
      setPayAmount('')
      setPayDetail('')
    } catch (err) {
      setError(err.message || 'Could not record payment')
    }
  }

  async function issueCreditNote() {
    if (!cnInvoice) return
    const amt = Number(cnAmount)
    if (!amt || amt <= 0) { setError('Enter a valid credit amount'); return }
    if (!cnReason.trim()) { setError('Enter a reason for the credit note'); return }
    setError('')
    try {
      await backend.issueCreditNote(cnInvoice.id, { amount: amt, reason: cnReason.trim(), date: cnDate })
      setCnInvoice(null)
      setCnAmount('')
      setCnReason('')
    } catch (err) {
      setError(err.message || 'Could not issue credit note')
    }
  }

  return (
    <div>
      <SectionTitle sub="Find any invoice by number, date range or type. PDFs are decrypted on your device.">
        Search invoices
      </SectionTitle>

      <Card>
        <div className="grid gap-3 sm:grid-cols-6">
          <Field label="Invoice number">
            <input
              className={inputCls}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. LN-K7QX92"
            />
          </Field>
          <Field label="Type">
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Client">
            <input
              className={inputCls}
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Client name"
            />
          </Field>
          <Field label="From date">
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To date">
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Btn onClick={() => run()} className="w-full">Search</Btn>
          </div>
        </div>
      </Card>

      <ErrorBox>{error}</ErrorBox>

      <div className="mt-5 space-y-3">
        {loaded && rows.length === 0 && (
          <Card className="text-center text-sm text-navy-500">No invoices found.</Card>
        )}
        {rows.map((r) => (
          <Card key={r.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 !p-4 ${r.status === 'cancelled' ? 'opacity-70' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-navy-900">{r.number}</span>
                {r.status === 'cancelled' && (
                  <Badge color="red">Cancelled</Badge>
                )}
                <Badge color={r.type === 'service' ? 'navy' : r.type === 'product' ? 'orange' : 'green'}>
                  {TYPES.find((t) => t.id === r.type)?.label || r.type}
                </Badge>
                {r.paymentStatus === 'paid' && <Badge color="green">Paid</Badge>}
                {r.paymentStatus === 'partial' && <Badge color="orange">Partial</Badge>}
                {(!r.paymentStatus || r.paymentStatus === 'unpaid') && r.status !== 'cancelled' && <Badge color="red">Unpaid</Badge>}
              </div>
              <p className="mt-1 truncate text-sm text-navy-600">{r.client?.name || r.clientName || ''}</p>
              <p className="text-xs text-navy-400">
                {fmtDate(r.date)}
                {r.dueDate && r.dueDate !== r.date ? ` · due ${fmtDate(r.dueDate)}` : ''}
                {r.paymentMethod ? ` · ${r.paymentMethod}` : ''}
                {r.paymentDetail ? ` · ${r.paymentDetail}` : ''}
                {r.bankName ? ` · ${r.bankName}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-navy-900">{bdt(r.total)}</p>
              <p className="mt-0.5 text-xs text-navy-500">
                cost {bdt(r.costTotal || 0)} · profit{' '}
                <span className={((Number(r.total) || 0) - (Number(r.costTotal) || 0)) >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                  {bdt((Number(r.total) || 0) - (Number(r.costTotal) || 0))}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                <Btn variant="outline" className="!px-3 !py-2 text-sm" disabled={busyId === r.id} onClick={() => view(r.id)}>
                  View
                </Btn>
                <Btn variant="outline" className="!px-3 !py-2 text-sm" disabled={busyId === r.id} onClick={() => download(r.id)}>
                  PDF
                </Btn>
                {r.status !== 'cancelled' && r.paymentStatus !== 'paid' && (
                  <Btn variant="gold" className="!px-3 !py-2 text-sm" onClick={() => {
                    setPayInvoice(r)
                    setPayAmount(String(Number(r.total) || 0))
                    setPayDate(new Date().toISOString().slice(0, 10))
                  }}>
                    Record Payment
                  </Btn>
                )}
                <Btn variant="outline" className="!px-3 !py-2 text-sm" onClick={() => {
                  const clone = { ...r }
                  delete clone.id
                  delete clone.blob
                  delete clone.status
                  delete clone.paymentStatus
                  delete clone.payments
                  delete clone.createdAt
                  navigate(`/new/${r.type}`, { state: { clone } })
                }}>
                  Duplicate
                </Btn>
                {r.status !== 'cancelled' && (
                  <Btn variant="outline" className="!px-3 !py-2 text-sm" onClick={() => {
                    setCnInvoice(r)
                    setCnAmount(String(Number(r.total) || 0))
                    setCnDate(new Date().toISOString().slice(0, 10))
                  }}>
                    Credit Note
                  </Btn>
                )}
                {r.status !== 'cancelled' && (
                  <Btn variant="outline" className="!px-3 !py-2 text-sm text-red-600" disabled={busyId === r.id} onClick={() => cancel(r.id)}>
                    Cancel
                  </Btn>
                )}
                <Btn variant="danger" className="!px-3 !py-2 text-sm" disabled={busyId === r.id} onClick={() => remove(r.id)}>
                  Delete
                </Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {payInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPayInvoice(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-navy-900">Record Payment</h3>
            <p className="mt-1 text-sm text-navy-500">{payInvoice.number} — total {bdt(payInvoice.total)}</p>
            <div className="mt-4 space-y-3">
              <Field label="Amount (BDT)">
                <input type="number" className={inputCls} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min="0" step="0.01" />
              </Field>
              <Field label="Method">
                <select className={inputCls} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {['Cash', 'bKash', 'Nagad', 'Bank transfer'].map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>
              {(payMethod === 'bKash' || payMethod === 'Nagad') && (
                <Field label={`${payMethod} number`}>
                  <input className={inputCls} value={payDetail} onChange={(e) => setPayDetail(e.target.value)} placeholder="e.g. 01XXXXXXXXX" />
                </Field>
              )}
              {payMethod === 'Bank transfer' && (
                <Field label="Account / reference">
                  <input className={inputCls} value={payDetail} onChange={(e) => setPayDetail(e.target.value)} placeholder="Account or reference number" />
                </Field>
              )}
              <Field label="Date">
                <input type="date" className={inputCls} value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </Field>
            </div>
            <ErrorBox>{error}</ErrorBox>
            <div className="mt-4 flex gap-2">
              <Btn variant="gold" className="flex-1" onClick={recordPayment}>Save Payment</Btn>
              <Btn variant="outline" onClick={() => setPayInvoice(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {cnInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCnInvoice(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-navy-900">Issue Credit Note</h3>
            <p className="mt-1 text-sm text-navy-500">{cnInvoice.number} — total {bdt(cnInvoice.total)}</p>
            <div className="mt-4 space-y-3">
              <Field label="Credit amount (BDT)">
                <input type="number" className={inputCls} value={cnAmount} onChange={(e) => setCnAmount(e.target.value)} min="0" step="0.01" />
              </Field>
              <Field label="Reason">
                <input className={inputCls} value={cnReason} onChange={(e) => setCnReason(e.target.value)} placeholder="e.g. Item returned, overcharge corrected" />
              </Field>
              <Field label="Date">
                <input type="date" className={inputCls} value={cnDate} onChange={(e) => setCnDate(e.target.value)} />
              </Field>
            </div>
            <ErrorBox>{error}</ErrorBox>
            <div className="mt-4 flex gap-2">
              <Btn variant="gold" className="flex-1" onClick={issueCreditNote}>Issue Credit Note</Btn>
              <Btn variant="outline" onClick={() => setCnInvoice(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}