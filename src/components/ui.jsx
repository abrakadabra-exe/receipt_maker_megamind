import React from 'react'

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold tracking-wide text-navy-700 uppercase">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 shadow-sm outline-none transition placeholder:text-navy-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-200'

export function Btn({ variant = 'primary', className = '', ...props }) {
  const variants = {
    primary:
      'bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-900 shadow-sm',
    gold: 'bg-gold-500 text-white hover:bg-gold-400 active:bg-gold-600 shadow-sm',
    outline:
      'border border-navy-200 bg-white text-navy-800 hover:border-navy-400 hover:bg-navy-50',
    danger:
      'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    ghost: 'text-navy-700 hover:bg-navy-100',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({ className = '', ...props }) {
  return (
    <div
      className={`rounded-xl border border-navy-100 bg-white p-5 shadow-sm ${className}`}
      {...props}
    />
  )
}

export function Badge({ children, color = 'gold' }) {
  const colors = {
    gold: 'bg-gold-100 text-gold-800',
    navy: 'bg-navy-100 text-navy-800',
    green: 'bg-emerald-100 text-emerald-800',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide ${colors[color]}`}>
      {children}
    </span>
  )
}

export function ErrorBox({ children }) {
  if (!children) return null
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  )
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold text-navy-900">{children}</h1>
      {sub ? <p className="mt-0.5 text-sm text-navy-500">{sub}</p> : null}
    </div>
  )
}