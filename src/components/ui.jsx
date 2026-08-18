import React from 'react'

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold tracking-wide text-purple-800 uppercase">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm text-navy-900 shadow-sm outline-none transition placeholder:text-navy-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'

export function Btn({ variant = 'primary', className = '', ...props }) {
  const variants = {
    primary:
      'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 shadow-sm',
    gold: 'bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 shadow-sm',
    outline:
      'border border-navy-200 bg-white text-navy-800 hover:border-orange-400 hover:bg-orange-50',
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

export function Badge({ children, color = 'orange' }) {
  const colors = {
    orange: 'bg-orange-100 text-orange-800',
    navy: 'bg-navy-100 text-navy-800',
    green: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
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
      <h1 className="text-xl font-bold text-purple-800">{children}</h1>
      {sub ? <p className="mt-0.5 text-sm text-navy-500">{sub}</p> : null}
    </div>
  )
}