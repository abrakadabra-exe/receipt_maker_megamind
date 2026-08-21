import React, { useState } from 'react'
import { backend, checkBruteForce, recordFailedAttempt, clearBruteForce } from '../lib/store'
import { setMasterKey } from '../lib/session'
import { Btn, Field, inputCls, ErrorBox } from '../components/ui'
import logoUrl from '../assets/megamind-logo-white.png'

function RecoveryScreen({ phrase, onDone }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mx-auto mt-10 w-full max-w-md px-4">
      <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-navy-900">Save your recovery phrase</h2>
        <p className="mt-2 text-sm text-navy-700">
          This is the <b>only</b> way to recover your invoices if you forget your password.
          Write it down and keep it somewhere safe. It is shown only once.
        </p>
        <div className="mt-4 rounded-lg border border-orange-200 bg-white p-4 text-center font-mono text-sm break-all text-navy-900">
          {phrase}
        </div>
        <div className="mt-4 flex gap-2">
          <Btn
            variant="gold"
            className="flex-1"            onClick={() => {
              navigator.clipboard?.writeText(phrase)
              setCopied(true)
            }}
          >
            {copied ? 'Copied' : 'Copy phrase'}
          </Btn>
          <Btn variant="outline" onClick={onDone}>
            I saved it
          </Btn>
        </div>
      </div>
    </div>
  )
}

export default function Login({ onAuthed, onFlowStart, onFlowEnd }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(0)
  const [recovery, setRecovery] = useState(null)
  const [pendingMasterKey, setPendingMasterKey] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setBusy(true)
    onFlowStart?.()
    try {
      if (mode === 'login') {
        const brute = await checkBruteForce(email.trim().toLowerCase())
        if (brute.blocked) {
          setError(`Too many failed attempts. Try again in ${brute.wait} seconds.`)
          setBusy(false)
          onFlowEnd?.()
          return
        }
      }
      const res =
        mode === 'signup'
          ? await backend.signUp(email.trim().toLowerCase(), password)
          : await backend.signIn(email.trim().toLowerCase(), password)
      setFailed(0)
      await clearBruteForce(email.trim().toLowerCase())
      setMasterKey(res.masterKey)
      if (res.recovery) {
        setPendingMasterKey(res.masterKey)
        setRecovery(res.recovery)
      } else {
        onAuthed()
      }
    } catch (err) {
      if (mode === 'login') {
        await recordFailedAttempt(email.trim().toLowerCase())
        setFailed((f) => f + 1)
      }
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
      onFlowEnd?.()
    }
  }

  if (recovery) {
    return (
      <RecoveryScreen
        phrase={recovery}
        onDone={() => {
          setMasterKey(pendingMasterKey)
          onAuthed()
        }}
      />
    )
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md px-4">
      <div className="mb-6 text-center">
        <div className="mx-auto flex w-fit items-center rounded-2xl bg-purple-700 p-2 shadow-md">
          <img src={logoUrl} alt="Megamind BD" className="h-10 w-auto sm:h-12" />
        </div>
        <p className="mt-1 text-sm text-navy-500">
          Professional invoices, securely stored
        </p>
      </div>

      <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex rounded-lg bg-purple-50 p-1">
          {['login', 'signup'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === m ? 'bg-purple-700 text-white shadow' : 'text-navy-600'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </Field>
          {mode === 'signup' && (
            <Field label="Confirm password">
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
          )}
          <ErrorBox>{error}</ErrorBox>
          <Btn type="submit" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </Btn>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-navy-400">
        Invoices are encrypted on your device before upload. Nobody else — not even the
        cloud provider — can read them.
      </p>
    </div>
  )
}