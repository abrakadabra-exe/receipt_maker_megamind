import React, { useEffect, useState } from 'react'
import { backend } from '../lib/store'
import { decryptToBlob, openBlob, downloadBlob } from '../lib/invoiceCrypto'
import { bdt } from '../lib/money'
import { TYPES } from '../lib/numbers'
import { Btn, Field, inputCls, Card, Badge, SectionTitle, ErrorBox } from '../components/ui'

export default function Search() {
  const [number, setNumber] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  async function run(filters = {}) {
    setError('')
    try {
      const list = await backend.queryInvoices({
        number: filters.number ?? number,
        type: filters.type ?? type,
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
    run({ number: '', type: '', from: '', to: '' })
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

  return (
    <div>
      <SectionTitle sub="Find any invoice by number, date range or type. PDFs are decrypted on your device.">
        Search invoices
      </SectionTitle>

      <Card>
        <div className="grid gap-3 sm:grid-cols-5">
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
          <Card key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 !p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-navy-900">{r.number}</span>
                <Badge color={r.type === 'service' ? 'navy' : r.type === 'product' ? 'gold' : 'green'}>
                  {TYPES.find((t) => t.id === r.type)?.label || r.type}
                </Badge>
              </div>
              <p className="mt-1 truncate text-sm text-navy-600">{r.client?.name || r.clientName || ''}</p>
              <p className="text-xs text-navy-400">
                {fmtDate(r.date)}
                {r.dueDate && r.dueDate !== r.date ? ` · due ${fmtDate(r.dueDate)}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-navy-900">{bdt(r.total)}</p>
              <div className="mt-2 flex gap-1.5">
                <Btn variant="outline" className="!px-3 !py-1.5 text-xs" disabled={busyId === r.id} onClick={() => view(r.id)}>
                  View
                </Btn>
                <Btn variant="outline" className="!px-3 !py-1.5 text-xs" disabled={busyId === r.id} onClick={() => download(r.id)}>
                  PDF
                </Btn>
                <Btn variant="danger" className="!px-3 !py-1.5 text-xs" disabled={busyId === r.id} onClick={() => remove(r.id)}>
                  Delete
                </Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}