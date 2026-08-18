import React, { useEffect, useRef, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { backend } from './lib/store'
import { setMasterKey, clearMasterKey, hasMasterKey } from './lib/session'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewInvoice from './pages/NewInvoice'
import Search from './pages/Search'
import Earnings from './pages/Earnings'
import Settings from './pages/Settings'
import Contacts from './pages/Contacts'
import { Btn, Field, inputCls, ErrorBox } from './components/ui'

function Unlock({ onUnlocked }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const masterKey = await backend.unlock(password)
      setMasterKey(masterKey)
      onUnlocked()
    } catch (err) {
      setError(err.message || 'Could not unlock')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-md px-4">
      <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-purple-800">Unlock your invoices</h1>
        <p className="mt-1 text-sm text-navy-500">
          You are signed in, but your encryption key was cleared. Enter your password to
          decrypt your invoices on this device.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Field label="Password">
            <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </Field>
          <ErrorBox>{error}</ErrorBox>
          <Btn type="submit" className="w-full" disabled={busy}>{busy ? 'Unlocking…' : 'Unlock'}</Btn>
        </form>
      </div>
    </div>
  )
}

function AppShell() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const location = useLocation()

  const authLockRef = useRef(false)

  useEffect(() => {
    const unsub = backend.onAuthChange((u) => {
      setReady(true)
      if (authLockRef.current) return
      setUser(u)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (user) return
    clearMasterKey()
  }, [user])

  useEffect(() => {
    if (user) window.location.hash = '#/'
  }, [user])

  async function logout() {
    clearMasterKey()
    await backend.signOut()
    setUser(null)
  }

  if (!ready) return null

  if (!user) {
    return (
      <Login
        onAuthed={async () => {
          setUser(await backend.getCurrentUser())
        }}
        onFlowStart={() => {
          authLockRef.current = true
        }}
        onFlowEnd={() => {
          authLockRef.current = false
        }}
      />
    )
  }

  const locked = !hasMasterKey() && location.pathname !== '/login'

  return (
    <Layout user={user} onLogout={logout}>
      {locked ? (
        <Unlock
          onUnlocked={() => setUser({ ...user })}
        />
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/new/:type" element={<NewInvoice />} />
          <Route path="/search" element={<Search />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/settings" element={<Settings user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </Layout>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}