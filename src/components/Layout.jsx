import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import logoUrl from '../assets/megamind-logo.png'

const invoiceTypes = [
  { to: '/new/service', label: 'Service' },
  { to: '/new/product', label: 'Product Sale' },
  { to: '/new/repair', label: 'Repair' },
]

const plainLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/search', label: 'Search' },
  { to: '/earnings', label: 'Earnings' },
  { to: '/settings', label: 'Settings' },
]

function linkCls({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-gold-500 text-purple-950' : 'text-purple-100 hover:bg-purple-600/70 hover:text-white'
  }`
}

export default function Layout({ onLogout, children }) {
  const [ddOpen, setDdOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const ddRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    setDdOpen(false)
    setMenuOpen(false)
    setSubOpen(false)
  }, [location])

  useEffect(() => {
    function onClickOutside(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-purple-700 shadow-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <NavLink to="/" className="flex items-center" aria-label="Megamind BD home">
            <span className="flex items-center rounded-lg bg-white px-1.5 py-1 shadow-sm">
              <img src={logoUrl} alt="Megamind BD" className="h-6 w-auto sm:h-7" />
            </span>
          </NavLink>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {plainLinks.slice(0, 1).map((l) => (
              <NavLink key={l.to} to={l.to} className={linkCls} end={l.to === '/'}>
                {l.label}
              </NavLink>
            ))}

            <div className="relative" ref={ddRef}>
              <button
                type="button"
                onClick={() => setDdOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  invoiceTypes.some((t) => location.pathname.startsWith(t.to))
                    ? 'bg-gold-500 text-purple-950'
                    : 'text-purple-100 hover:bg-purple-600/70 hover:text-white'
                }`}
                aria-haspopup="menu"
                aria-expanded={ddOpen}
              >
                New Invoice
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${ddOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div
                className={`absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-purple-100 bg-white shadow-xl transition-all duration-200 ease-out ${
                  ddOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
                }`}
                role="menu"
              >
                {invoiceTypes.map((t) => (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 text-sm font-semibold transition first:rounded-t-xl last:rounded-b-xl ${
                        isActive ? 'bg-purple-50 text-purple-700' : 'text-navy-700 hover:bg-purple-50'
                      }`
                    }
                  >
                    {t.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {plainLinks.slice(1).map((l) => (
              <NavLink key={l.to} to={l.to} className={linkCls}>
                {l.label}
              </NavLink>
            ))}

            <button
              onClick={onLogout}
              className="rounded-lg border border-purple-400/60 px-3 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-600/70 hover:text-white"
            >
              Logout
            </button>
          </nav>

          <button
            type="button"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-purple-100 transition hover:bg-purple-600/70 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        <div
          className={`overflow-hidden bg-purple-800 transition-all duration-300 ease-out md:hidden ${
            menuOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <nav className="space-y-1 px-4 pb-4 pt-2">
            <NavLink to="/" end className={linkCls}>
              Dashboard
            </NavLink>

            <button
              type="button"
              onClick={() => setSubOpen((v) => !v)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${
                invoiceTypes.some((t) => location.pathname.startsWith(t.to))
                  ? 'bg-gold-500 text-purple-950'
                  : 'text-purple-100 hover:bg-purple-600/70 hover:text-white'
              }`}
              aria-expanded={subOpen}
            >
              New Invoice
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`h-3.5 w-3.5 transition-transform duration-200 ${subOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                subOpen ? 'max-h-44 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="ml-2 space-y-1 border-l-2 border-purple-600 pl-3">
                {invoiceTypes.map((t) => (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        isActive ? 'text-gold-300' : 'text-purple-200 hover:bg-purple-600/70 hover:text-white'
                      }`
                    }
                  >
                    {t.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {plainLinks.slice(1).map((l) => (
              <NavLink key={l.to} to={l.to} className={linkCls}>
                {l.label}
              </NavLink>
            ))}

            <button
              onClick={onLogout}
              className="w-full rounded-lg border border-purple-400/60 px-3 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-600/70 hover:text-white"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-16">{children}</main>
      <footer className="border-t border-navy-100 bg-white py-4 text-center text-xs text-navy-400">
        Megamind BD · +880199289339 · megamindbd.official@gmail.com
      </footer>
    </div>
  )
}