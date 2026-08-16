import React from 'react'
import { NavLink } from 'react-router-dom'
import logoUrl from '../assets/megamind-logo.png'

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/new/service', label: 'Service' },
  { to: '/new/product', label: 'Product Sale' },
  { to: '/new/repair', label: 'Repair' },
  { to: '/search', label: 'Search' },
  { to: '/settings', label: 'Settings' },
]

export default function Layout({ onLogout, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-navy-900 bg-navy-800 shadow">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src={logoUrl} alt="Megamind BD" className="h-7 w-auto brightness-0 invert" />
            <span className="text-base font-bold tracking-wide text-white">Megamind BD</span>
          </div>
          <nav className="flex flex-1 flex-wrap items-center justify-end gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive ? 'bg-gold-500 text-navy-950' : 'text-navy-100 hover:bg-navy-700'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={onLogout}
            className="rounded-lg border border-navy-600 px-3 py-1.5 text-xs font-semibold text-navy-100 transition hover:bg-navy-700"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-16">{children}</main>
      <footer className="border-t border-navy-100 bg-white py-4 text-center text-xs text-navy-400">
        Megamind BD · +880199289339 · megamindbd.official@gmail.com
      </footer>
    </div>
  )
}