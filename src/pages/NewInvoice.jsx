import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { backend } from '../lib/store'
import { generateNumber, typeMeta } from '../lib/numbers'
import { buildEncryptedBlob, decryptToBlob, openBlob, downloadBlob } from '../lib/invoiceCrypto'
import { bdt } from '../lib/money'
import { Btn, Field, inputCls, Card, ErrorBox, SectionTitle } from '../components/ui'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function useSyncedToday() {
  const [value, setValue] = useState(today())
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (touched) return undefined
    const id = setInterval(() => {
      const t = today()
      setValue((prev) => (prev === t ? prev : t))
    }, 60000)
    return () => clearInterval(id)
  }, [touched])
  return [value, setValue, setTouched]
}

function newItem(type) {
  const base = { desc: '', qty: 1, unitPrice: '', costPrice: '', taxPct: 0, total: 0 }
  if (type === 'product') base.warranty = ''
  if (type === 'repair') base.kind = 'labour'
  return base
}

const TYPE_COLUMNS = {
  service: [
    { key: 'desc', label: 'Description', flex: '1' },
    { key: 'qty', label: 'Qty', width: '4.5rem' },
    { key: 'unitPrice', label: 'Unit price (BDT)', width: '7rem' },
    { key: 'costPrice', label: 'Cost price (BDT)', width: '7rem' },
    { key: 'taxPct', label: 'Tax %', width: '4.5rem' },
    { key: 'total', label: 'Total', width: '7rem', readOnly: true },
  ],
  product: [
    { key: 'desc', label: 'Description', flex: '1' },
    { key: 'qty', label: 'Qty', width: '4.5rem' },
    { key: 'unitPrice', label: 'Unit price (BDT)', width: '7rem' },
    { key: 'costPrice', label: 'Cost price (BDT)', width: '7rem' },
    { key: 'warranty', label: 'Warranty', width: '6rem' },
    { key: 'taxPct', label: 'Tax %', width: '4.5rem' },
    { key: 'total', label: 'Total', width: '7rem', readOnly: true },
  ],
  repair: [
    { key: 'kind', label: 'Type', width: '6rem' },
    { key: 'desc', label: 'Description', flex: '1' },
    { key: 'qty', label: 'Qty', width: '4.5rem' },
    { key: 'unitPrice', label: 'Unit price (BDT)', width: '7rem' },
    { key: 'costPrice', label: 'Cost price (BDT)', width: '7rem' },
    { key: 'taxPct', label: 'Tax %', width: '4.5rem' },
    { key: 'total', label: 'Total', width: '7rem', readOnly: true },
  ],
}

export default function NewInvoice() {
  const { type } = useParams()
  const navigate = useNavigate()
  const meta = typeMeta(type)

  const [client, setClient] = useState({ name: '', phone: '', address: '' })
  const [contacts, setContacts] = useState([])
  const [showContacts, setShowContacts] = useState(false)
  const [activeContact, setActiveContact] = useState(-1)
  const [date, setDate, setDateTouched] = useSyncedToday()
  const [dueDate, setDueDate, setDueDateTouched] = useSyncedToday()
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentDetail, setPaymentDetail] = useState('')
  const [bankName, setBankName] = useState('')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState('')
  const [repair, setRepair] = useState({ device: '', complaint: '', workDone: '' })
  const [items, setItems] = useState([newItem(type)])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(null)
  const [previewState, setPreviewState] = useState(null)

  useEffect(() => {
    setSaved(null)
    setPreviewState(null)
    setError('')
  }, [type])

  useEffect(() => {
    backend
      .queryContacts('')
      .then(setContacts)
      .catch(() => setContacts([]))
  }, [])

  const suggestions = useMemo(() => {
    const q = client.name.trim().toLowerCase()
    if (!q) return []
    return contacts.filter((c) => (c.name || '').toLowerCase().includes(q)).slice(0, 6)
  }, [contacts, client.name])

  function pickContact(c) {
    setClient({ name: c.name, phone: c.phone || '', address: c.address || '' })
    setShowContacts(false)
    setActiveContact(-1)
  }

  function onClientNameChange(value) {
    setClient({ ...client, name: value })
    setShowContacts(true)
    setActiveContact(-1)
  }

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0),
      0,
    )
    const costTotal = items.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.costPrice) || 0),
      0,
    )
    const disc = Number(discount) || 0
    const taxable = subtotal - disc
    const taxedSubtotal = items.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0) * ((Number(it.taxPct) || 0) / 100),
      0,
    )
    const taxTotal = subtotal > 0 ? (taxedSubtotal / subtotal) * taxable : 0
    return {
      subtotal,
      costTotal,
      taxTotal,
      discount: disc,
      total: taxable + taxTotal,
      profit: taxable + taxTotal - costTotal,
    }
  }, [items, discount])

  function patchItem(i, patch) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  function itemTotal(it) {
    return (Number(it.qty) || 0) * (Number(it.unitPrice) || 0)
  }


  function validate() {
    if (!client.name.trim()) return 'Enter the client / company name (Billed To)'
    if (type === 'repair' && !repair.device.trim()) return 'Enter the device / unit being repaired'
    if (!items.length) return 'Add at least one line item'
    for (const it of items) {
      if (!it.desc.trim()) return 'Every line item needs a description'
      if (!(Number(it.qty) > 0)) return 'Quantities must be greater than zero'
      if (!(Number(it.unitPrice) >= 0)) return 'Unit prices must be zero or more'
      if (!(Number(it.costPrice) >= 0)) return 'Cost prices must be zero or more'
    }
    return null
  }

  async function findFreeNumber() {
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateNumber(type)
      const existing = await backend.queryInvoices({ number: candidate })
      if (!existing.length) return candidate
    }
    throw new Error('Could not generate a unique invoice number. Try again.')
  }

  function buildRecord(number) {
    return {
      number,
      type,
      date,
      dueDate,
      client,
      paymentMethod,
      paymentDetail,
      bankName,
      notes,
      discount: totals.discount,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      costTotal: totals.costTotal,
      total: totals.total,
      repair: type === 'repair' ? repair : undefined,
      items: items.map((it) => ({
        desc: it.desc.trim(),
        qty: Number(it.qty) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        costPrice: Number(it.costPrice) || 0,
        taxPct: Number(it.taxPct) || 0,
        warranty: it.warranty?.trim() || '',
        kind: it.kind || 'labour',
        total: itemTotal(it),
      })),
      status: 'active',
      createdAt: Date.now(),
    }
  }

  async function renderPdf(record) {
    const encrypted = await buildEncryptedBlob(record)
    return decryptToBlob(encrypted)
  }

  async function preview(e) {
    e.preventDefault()
    setError('')
    const problem = validate()
    if (problem) { setError(problem); return }
    setBusy(true)
    try {
      const blob = await renderPdf(buildRecord('PREVIEW'))
      setPreviewState({ url: URL.createObjectURL(blob), number: "PREVIEW" })
    } catch (err) {
      setError(err.message || 'Could not generate preview')
    } finally {
      setBusy(false)
    }
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    const problem = validate()
    if (problem) { setError(problem); return }
    setBusy(true)
    try {
      const number = await findFreeNumber()
      const record = buildRecord(number)
      const encrypted = await buildEncryptedBlob(record)
      const stored = await backend.saveInvoice({ ...record, blob: encrypted })
      if (client.name.trim()) {
        backend.saveContact({ name: client.name, phone: client.phone, address: client.address }).catch(() => {})
      }
      setSaved({ ...record, id: stored.id })
    } catch (err) {
      setError(err.message || 'Could not save invoice')
    } finally {
      setBusy(false)
    }
  }

  async function viewSaved() {
    if (!saved) return
    const rec = await backend.getInvoice(saved.id)
    if (!rec) { setError('Invoice not found'); return }
    const blob = await decryptToBlob(rec.blob)
    openBlob(blob)
  }

  async function downloadSaved() {
    if (!saved) return
    const rec = await backend.getInvoice(saved.id)
    if (!rec) { setError('Invoice not found'); return }
    const blob = await decryptToBlob(rec.blob)
    downloadBlob(blob, `${saved.number}.pdf`)
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-orange-300 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7 text-emerald-600">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-4 text-xl font-bold text-purple-800">Invoice saved</h1>
          <p className="mt-1 text-sm text-navy-500">
            Your invoice has been compressed, encrypted and stored in the cloud.
          </p>
          <div className="mt-4 rounded-lg bg-purple-700 p-4 text-white">
            <p className="text-xs tracking-widest text-orange-400 uppercase">Invoice number</p>
            <p className="mt-1 font-mono text-2xl font-bold">{saved.number}</p>
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Btn variant="gold" onClick={viewSaved}>View PDF</Btn>
            <Btn variant="outline" onClick={downloadSaved}>Download</Btn>
            <Btn variant="ghost" onClick={() => { setSaved(null); setItems([newItem(type)]) }}>New invoice</Btn>
            <Btn variant="ghost" onClick={() => navigate('/')}>Dashboard</Btn>
          </div>
        </Card>
      </div>
    )
  }

  const cols = TYPE_COLUMNS[type]

  return (
    <div>
      <SectionTitle sub={`Random number like ${typeMeta(type).prefix}-K7QX92 is generated on save.`}>
        {meta.label}
      </SectionTitle>

      <form onSubmit={save} className="space-y-5">
        <Card>
          <h3 className="mb-3 text-xs font-bold tracking-wide text-purple-800 uppercase">Billed To</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Client / company name" className="sm:col-span-3">
              <div className="relative">
                <input
                  className={inputCls}
                  value={client.name}
                  onChange={(e) => onClientNameChange(e.target.value)}
                  onFocus={() => setShowContacts(true)}
                  onBlur={() => setTimeout(() => setShowContacts(false), 150)}
                  placeholder="e.g. Doctor's Healthcare LTD"
                />
                {showContacts && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-navy-100 bg-white shadow-lg">
                    {suggestions.map((c, i) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickContact(c) }}
                        className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-orange-50 ${i === activeContact ? 'bg-orange-50' : ''}`}
                      >
                        <span className="font-semibold text-navy-900">{c.name}</span>
                        {c.phone ? <span className="ml-2 text-xs text-navy-500">{c.phone}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} placeholder="+880…" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className={inputCls} value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} placeholder="Optional" />
            </Field>
            <Field label="Invoice date">
              <input type="date" className={inputCls} value={date} onChange={(e) => { setDate(e.target.value); setDateTouched(true) }} />
            </Field>
            <Field label="Due date">
              <input type="date" className={inputCls} value={dueDate} onChange={(e) => { setDueDate(e.target.value); setDueDateTouched(true) }} />
            </Field>
            <Field label="Payment method">
              <select
                className={inputCls}
                value={paymentMethod}
                onChange={(e) => { setPaymentMethod(e.target.value); setPaymentDetail(''); setBankName('') }}
              >
                <option value="">Select method…</option>
                <option value="Cash">Cash</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank">Bank transfer</option>
              </select>
            </Field>
            {(paymentMethod === 'bKash' || paymentMethod === 'Nagad') && (
              <Field label={`${paymentMethod} number`}>
                <input className={inputCls} value={paymentDetail} onChange={(e) => setPaymentDetail(e.target.value)} placeholder={`Enter ${paymentMethod} number…`} />
              </Field>
            )}
            {paymentMethod === 'Bank' && (
              <>
                <Field label="Bank name">
                  <input className={inputCls} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. bKash / Islami Bank…" />
                </Field>
                <Field label="Account number">
                  <input className={inputCls} value={paymentDetail} onChange={(e) => setPaymentDetail(e.target.value)} placeholder="Enter account number…" />
                </Field>
              </>
            )}
          </div>
        </Card>

        {type === 'repair' && (
          <Card>
            <h3 className="mb-3 text-xs font-bold tracking-wide text-purple-800 uppercase">Repair details</h3>
            <div className="grid gap-3">
              <Field label="Device / unit">
                <input className={inputCls} value={repair.device} onChange={(e) => setRepair({ ...repair, device: e.target.value })} placeholder="e.g. HP ProBook 450 G8, Laptop" />
              </Field>
              <Field label="Reported issue (complaint)">
                <input className={inputCls} value={repair.complaint} onChange={(e) => setRepair({ ...repair, complaint: e.target.value })} placeholder="e.g. Screen flickering, won't boot" />
              </Field>
              <Field label="Work performed">
                <textarea className={inputCls} rows={2} value={repair.workDone} onChange={(e) => setRepair({ ...repair, workDone: e.target.value })} placeholder="e.g. Replaced display panel, updated drivers" />
              </Field>
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wide text-purple-800 uppercase">Line items</h3>
            <Btn type="button" variant="outline" onClick={() => setItems((p) => [...p, newItem(type)])}>
              + Add item
            </Btn>
          </div>

          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-lg border border-purple-100 bg-purple-50/40 p-3">
                <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-7">
                  {cols.map((c) => {
                    if (c.readOnly) {
                      return (
                        <Field key={c.key} label={c.label} className="hidden sm:block">
                          <div className="rounded-lg bg-purple-100 px-3 py-2.5 text-right text-sm font-semibold text-purple-800">
                            {bdt(itemTotal(it))}
                          </div>
                        </Field>
                      )
                    }
                    return (
                      <Field key={c.key} label={c.label} className={c.flex ? 'col-span-2 sm:col-span-1' : 'min-w-0'}>
                        {c.key === 'kind' ? (
                          <select
                            className={inputCls}
                            value={it.kind}
                            onChange={(e) => patchItem(i, { kind: e.target.value })}
                          >
                            <option value="labour">Labour</option>
                            <option value="parts">Parts</option>
                          </select>
                        ) : (
                          <input
                            className={inputCls}
                            type={c.key === 'qty' || c.key === 'unitPrice' || c.key === 'taxPct' ? 'number' : 'text'}
                            min="0"
                            step="any"
                            value={it[c.key]}
                            placeholder={c.key === 'warranty' ? '6 months' : ''}
                            onChange={(e) => patchItem(i, { [c.key]: e.target.value })}
                          />
                        )}
                      </Field>
                    )
                  })}
                  <div className="hidden items-end sm:flex">
                    <Btn
                      type="button"
                      variant="danger"
                      className="px-3 py-2.5"
                      onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))}
                      disabled={items.length === 1}
                    >
                      Remove
                    </Btn>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-navy-100 pt-2 sm:hidden">
                  <span className="text-xs font-semibold tracking-wide text-navy-600 uppercase">Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-navy-900">{bdt(itemTotal(it))}</span>
                    <Btn
                      type="button"
                      variant="danger"
                      className="!px-3 !py-2 text-xs"
                      onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))}
                      disabled={items.length === 1}
                    >
                      Remove
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Discount (BDT)">
              <input type="number" min="0" step="any" className={inputCls} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Notes">
              <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, special instructions…" />
            </Field>
          </div>
          <div className="mt-4 space-y-1.5 rounded-lg bg-purple-50/60 p-4 text-sm">
            <div className="flex justify-between text-navy-600">
              <span>Subtotal</span><span className="font-semibold">{bdt(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-navy-600">
                <span>Discount</span><span className="font-semibold">- {bdt(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-navy-600">
              <span>Tax</span><span className="font-semibold">{bdt(totals.taxTotal)}</span>
            </div>
            <div className="flex justify-between rounded-md bg-orange-500 px-3 py-2 text-white">
              <span className="font-bold">Grand total</span>
              <span className="font-bold">{bdt(totals.total)}</span>
            </div>
            <div className="mt-2 border-t border-navy-200 pt-2">
              <div className="flex justify-between text-navy-600">
                <span>Total cost (your side)</span><span className="font-semibold">{bdt(totals.costTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Est. profit</span><span>{bdt(totals.profit)}</span>
              </div>
              <p className="pt-1 text-[11px] text-navy-400">
                Cost and profit never appear on the client PDF.
              </p>
            </div>
          </div>
        </Card>

        <ErrorBox>{error}</ErrorBox>

        <div className="flex flex-wrap gap-2">
          <Btn type="submit" variant="gold" disabled={busy} className="flex-1 sm:flex-none">
            {busy ? 'Encrypting & saving…' : 'Save invoice'}
          </Btn>
          <Btn type="button" variant="outline" onClick={preview} disabled={busy}>
            Preview PDF
          </Btn>
          <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-purple-800 transition hover:bg-purple-50">
            Cancel
          </Link>
        </div>
      </form>

      {previewState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-purple-950/70 p-1.5 sm:p-3">
          <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-navy-100 px-3 py-3 sm:px-4">
              <span className="min-w-0 truncate text-sm font-bold text-navy-900">PDF preview — {previewState.number}</span>
              <div className="flex gap-2">
                <Btn variant="outline" className="!px-3 !py-2 text-sm" onClick={() => downloadBlobFromUrl(previewState.url, 'invoice-preview.pdf')}>
                  Download
                </Btn>
                <Btn variant="ghost" className="!px-3 !py-2 text-sm" onClick={() => { URL.revokeObjectURL(previewState.url); setPreviewState(null) }}>
                  Close
                </Btn>
              </div>
            </div>
            <iframe title="Invoice preview" src={previewState.url} className="w-full flex-1" />
          </div>
        </div>
      )}
    </div>
  )

function downloadBlobFromUrl(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
}