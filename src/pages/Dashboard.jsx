import React from 'react'
import { Link } from 'react-router-dom'
import { TYPES } from '../lib/numbers'

const ICONS = {
  service: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  product: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
      <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  ),
  repair: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7z" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
}

export default function Dashboard({ user }) {
  return (
    <div>
      <div className="rounded-xl bg-purple-700 p-6 text-white shadow-md">
        <p className="text-xs font-semibold tracking-widest text-orange-300 uppercase">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold break-all">{user?.email}</h1>
        <p className="mt-2 text-sm text-purple-100">
          Create a new invoice or find an existing one. Every PDF is compressed,
          encrypted on this device and stored securely in the cloud.
        </p>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-bold tracking-wide text-navy-700 uppercase">Create invoice</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {TYPES.map((t) => (
          <Link
            key={t.id}
            to={`/new/${t.id}`}
            className="group rounded-xl border border-navy-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md"
          >
            <div className="text-orange-500">{ICONS[t.id]}</div>
            <h3 className="mt-3 font-bold text-navy-900 group-hover:text-navy-700">{t.label}</h3>
            <p className="mt-1 text-xs text-navy-500">{t.blurb}</p>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-sm font-bold tracking-wide text-navy-700 uppercase">Business</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/search"
          className="block rounded-xl border border-navy-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md"
        >
          <div className="text-orange-500">{ICONS.search}</div>
          <h3 className="mt-3 font-bold text-navy-900">Search invoices</h3>
          <p className="mt-1 text-xs text-navy-500">By invoice number, date range or type</p>
        </Link>
        <Link
          to="/earnings"
          className="block rounded-xl border border-navy-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md"
        >
          <div className="text-orange-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
              <path d="M3 3v18h18" />
              <path d="M7 15l4-4 3 3 5-6" />
            </svg>
          </div>
          <h3 className="mt-3 font-bold text-navy-900">Monthly earnings</h3>
          <p className="mt-1 text-xs text-navy-500">Revenue, costs and profit by month</p>
        </Link>
      </div>
    </div>
  )
}