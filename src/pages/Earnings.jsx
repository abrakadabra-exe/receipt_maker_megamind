import React, { useEffect, useMemo, useState } from 'react'
import { backend } from '../lib/store'
import { decryptToBlob, openBlob } from '../lib/invoiceCrypto'
import { bdt } from '../lib/money'
import { TYPES } from '../lib/numbers'
import { Btn, Card, Badge, SectionTitle, ErrorBox } from '../components/ui'

function monthKey(date) {
  return (date || '').slice(0, 7)
}

function monthLabel(key) {
  if (!key) return '—'
  const [y, m] = key.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${names[Number(m) - 1]} ${y}`
}

function invoiceProfit(inv) {
  const cost = Number(inv.costTotal) || 0
  return { cost, hasCost: inv.costTotal !== undefined && inv.costTotal !== null, profit: (Number(inv.total) || 0) - cost }
}

const RANGES = [
  { id: 'all', label: 'All' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
]

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rangeBounds(range, fromDate, toDate) {
  const today = new Date()
  switch (range) {
    case '7d':
      return { from: iso(new Date(today.getTime() - 7 * 86400000)), to: iso(today) }
    case '30d':
      return { from: iso(new Date(today.getTime() - 30 * 86400000)), to: iso(today) }
    case 'month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: iso(first), to: iso(today) }
    }
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const last = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: iso(first), to: iso(last) }
    }
    case 'custom':
      return { from: fromDate, to: toDate }
    default:
      return { from: '', to: '' }
  }
}

export default function Earnings() {
  const [rows, setRows] = useState([])
  const [type, setType] = useState('')
  const [range, setRange] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [openMonth, setOpenMonth] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    backend
      .queryInvoices({})
      .then(setRows)
      .catch((err) => setError(err.message || 'Could not load earnings'))
      .finally(() => setLoaded(true))
  }, [])

  const byMonth = useMemo(() => {
    const { from, to } = rangeBounds(range, fromDate, toDate)
    const active = rows.filter((r) => r.status !== 'cancelled')
    let filtered = type ? active.filter((r) => r.type === type) : active
    if (from) filtered = filtered.filter((i) => i.date >= from)
    if (to) filtered = filtered.filter((i) => i.date <= to)
    const map = new Map()
    for (const inv of filtered) {
      const key = monthKey(inv.date)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(inv)
    }
    return [...map.entries()]
      .map(([key, invoices]) => {
        const revenue = invoices.reduce((s, i) => s + (Number(i.total) || 0), 0)
        const cost = invoices.reduce((s, i) => s + ((Number(i.costTotal) || 0)), 0)
        const missingCost = invoices.some((i) => i.costTotal === undefined || i.costTotal === null)
        return { key, invoices, revenue, cost, missingCost, profit: revenue - cost }
      })
      .sort((a, b) => (a.key < b.key ? 1 : -1))
  }, [rows, type, range, fromDate, toDate])

  const totals = useMemo(
    () => byMonth.reduce(
      (s, m) => ({
        revenue: s.revenue + m.revenue,
        cost: s.cost + m.cost,
        profit: s.profit + m.profit,
        count: s.count + m.invoices.length,
      }),
      { revenue: 0, cost: 0, profit: 0, count: 0 },
    ),
    [byMonth],
  )

  const anyMissingCost = byMonth.some((m) => m.missingCost)
  const cancelledCount = rows.filter((r) => r.status === 'cancelled').length

  function pickRange(id) {
    setRange(id)
    setFromDate('')
    setToDate('')
    setOpenMonth(null)
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

  function fmtDate(d) {
    if (!d) return '—'
    const dt = new Date(`${d}T00:00:00`)
    return Number.isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div>
      <SectionTitle sub="Revenue, costs and profit for any period. Cost prices never appear on client PDFs.">
        Earnings
      </SectionTitle>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => pickRange(r.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                range === r.id
                  ? 'bg-orange-500 text-white shadow'
                  : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => pickRange('custom')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              range === 'custom'
                ? 'bg-orange-500 text-white shadow'
                : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
            }`}
          >
            Custom
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-navy-700 uppercase">From date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
              value={fromDate}
              disabled={range !== 'custom'}
              onChange={(e) => { setFromDate(e.target.value); setRange('custom') }}
            />
          </div>
          <div className="w-40">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-navy-700 uppercase">To date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
              value={toDate}
              disabled={range !== 'custom'}
              onChange={(e) => { setToDate(e.target.value); setRange('custom') }}
            />
          </div>
          <div className="w-full sm:w-56">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-navy-700 uppercase">Invoice type</span>
            <select
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 shadow-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              value={type}
              onChange={(e) => { setType(e.target.value); setOpenMonth(null) }}
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <ErrorBox>{error}</ErrorBox>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card className="border-l-4 !border-l-orange-500">
          <p className="text-xs font-bold tracking-wide text-navy-500 uppercase">Revenue</p>
          <p className="mt-1 text-xl font-bold text-navy-900">{bdt(totals.revenue)}</p>
        </Card>
        <Card className="border-l-4 !border-l-purple-500">
          <p className="text-xs font-bold tracking-wide text-navy-500 uppercase">Cost</p>
          <p className="mt-1 text-xl font-bold text-navy-900">{bdt(totals.cost)}</p>
        </Card>
        <Card className="border-l-4 !border-l-emerald-500">
          <p className="text-xs font-bold tracking-wide text-navy-500 uppercase">Profit</p>
          <p className={`mt-1 text-xl font-bold ${totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{bdt(totals.profit)}</p>
        </Card>
      </div>

      {anyMissingCost && (
        <div className="mt-4 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-900">
          Some invoices were made before cost prices existed — they count with zero cost.
          Recreate those invoices with cost prices and the profit numbers will be exact.
        </div>
      )}

      {cancelledCount > 0 && (
        <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
          {cancelledCount} cancelled invoice{cancelledCount > 1 ? 's' : ''} excluded from earnings above.
        </div>
      )}

      {loaded && byMonth.length === 0 && (
        <Card className="mt-5 text-center text-sm text-navy-500">No invoices in this period.</Card>
      )}

      {byMonth.length > 0 && (
        <Card className="mt-5 !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-100 bg-purple-50 text-left text-xs font-bold uppercase tracking-wide text-purple-800">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Invoices</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map((m) => (
                  <React.Fragment key={m.key}>
                    <tr
                      className="cursor-pointer border-b border-navy-50 transition hover:bg-navy-50/60"
                      onClick={() => setOpenMonth(openMonth === m.key ? null : m.key)}
                    >
                      <td className="px-4 py-3 font-semibold text-navy-900">
                        {monthLabel(m.key)}
                        {m.missingCost ? <span className="ml-2 text-[11px] font-normal text-orange-700">cost missing</span> : null}
                      </td>
                      <td className="px-4 py-3 text-right text-navy-600">{m.invoices.length}</td>
                      <td className="px-4 py-3 text-right font-semibold text-navy-800">{bdt(m.revenue)}</td>
                      <td className="px-4 py-3 text-right text-navy-600">{bdt(m.cost)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${m.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {bdt(m.profit)}
                      </td>
                    </tr>
                    {openMonth === m.key && (
                      <tr className="border-b border-navy-50 bg-navy-50/40">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="space-y-2">
                            {m.invoices.map((inv) => {
                              const { profit, hasCost } = invoiceProfit(inv)
                              return (
                                <div key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-navy-100 bg-white p-3">
                                  <span className="font-mono text-xs font-bold text-navy-900">{inv.number}</span>
                                  <Badge color={inv.type === 'service' ? 'navy' : inv.type === 'product' ? 'orange' : 'green'}>
                                    {TYPES.find((t) => t.id === inv.type)?.label || inv.type}
                                  </Badge>
                                  <span className="min-w-0 flex-1 truncate text-sm text-navy-600">
                                    {inv.client?.name || inv.clientName || ''} · {fmtDate(inv.date)}
                                  </span>
                                  <span className="text-sm text-navy-600">{bdt(inv.total)}</span>
                                  <span className="text-xs text-navy-500">
                                    {hasCost ? `cost ${bdt(inv.costTotal)}` : 'no cost'}
                                  </span>
                                  <span className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {bdt(profit)}
                                  </span>
                                  <Btn variant="outline" className="!px-3 !py-2 text-sm" disabled={busyId === inv.id} onClick={() => view(inv.id)}>
                                    View
                                  </Btn>
                                </div>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-orange-500 text-white">
                  <td className="px-4 py-3 font-bold">Total ({totals.count} invoices)</td>
                  <td className="px-4 py-3 text-right font-bold">{totals.count}</td>
                  <td className="px-4 py-3 text-right font-bold">{bdt(totals.revenue)}</td>
                  <td className="px-4 py-3 text-right font-bold">{bdt(totals.cost)}</td>
                  <td className="px-4 py-3 text-right font-bold">{bdt(totals.profit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}