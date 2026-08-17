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

export default function Earnings() {
  const [rows, setRows] = useState([])
  const [type, setType] = useState('')
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
    const filtered = type ? rows.filter((r) => r.type === type) : rows
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
  }, [rows, type])

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
      <SectionTitle sub="Your revenue, costs and profit for every month. Cost prices never appear on client PDFs.">
        Monthly earnings
      </SectionTitle>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-56">
            <span className="mb-1 block text-xs font-semibold tracking-wide text-navy-700 uppercase">Invoice type</span>
            <select
              className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 shadow-sm outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
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

      {anyMissingCost && (
        <div className="mt-4 rounded-lg border border-gold-300 bg-gold-50 px-4 py-3 text-sm text-gold-900">
          Some invoices were made before cost prices existed — they count with zero cost.
          Recreate those invoices with cost prices and the profit numbers will be exact.
        </div>
      )}

      {loaded && byMonth.length === 0 && (
        <Card className="mt-5 text-center text-sm text-navy-500">No invoices yet.</Card>
      )}

      {byMonth.length > 0 && (
        <Card className="mt-5 !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-100 bg-navy-50 text-left text-xs font-bold uppercase tracking-wide text-navy-700">
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
                        {m.missingCost ? <span className="ml-2 text-[11px] font-normal text-gold-700">cost missing</span> : null}
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
                                  <Badge color={inv.type === 'service' ? 'navy' : inv.type === 'product' ? 'gold' : 'green'}>
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
                <tr className="bg-navy-800 text-white">
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