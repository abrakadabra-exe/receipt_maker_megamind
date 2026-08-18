import React, { useState } from 'react'
import { backend, backendName, isDemoMode } from '../lib/store'
import { Btn, Field, inputCls, Card, Badge, SectionTitle, ErrorBox } from '../components/ui'

export default function Settings({ user }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function changePassword(e) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return }
    if (newPassword !== confirm) { setError('New passwords do not match'); return }
    setBusy(true)
    try {
      await backend.changePassword(oldPassword, newPassword)
      setOldPassword(''); setNewPassword(''); setConfirm('')
      setMsg('Password changed. Your invoices remain encrypted with your new password.')
    } catch (err) {
      setError(err.message || 'Could not change password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle sub="Account, security and storage status.">Settings</SectionTitle>

      <Card>
        <h3 className="text-xs font-bold tracking-wide text-navy-700 uppercase">Account</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold break-all text-navy-900">{user?.email}</span>
          <Badge color={isDemoMode() ? 'orange' : 'green'}>
            {isDemoMode() ? 'Demo mode (browser storage)' : `Connected to ${backendName()}`}
          </Badge>
        </div>
        {isDemoMode() && (
          <p className="mt-3 rounded-lg bg-orange-50 p-3 text-xs leading-relaxed text-orange-900">
            You are in demo mode: invoices are encrypted and saved in this browser only.
            To use cloud storage, create a free Firebase project and add its config to a{' '}
            <code className="font-mono">.env</code> file (see README). Until then you can
            still create, search and download PDFs.
          </p>
        )}
      </Card>

      <Card className="mt-5">
        <h3 className="text-xs font-bold tracking-wide text-navy-700 uppercase">Change password</h3>
        <p className="mt-1 text-xs text-navy-500">
          Your invoices stay encrypted. After changing the password your encryption key is
          re-wrapped automatically — no data is lost.
        </p>
        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <Field label="Current password">
            <input type="password" className={inputCls} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="New password">
              <input type="password" className={inputCls} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </Field>
            <Field label="Confirm new password">
              <input type="password" className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </Field>
          </div>
          <ErrorBox>{error}</ErrorBox>
          {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>}
          <Btn type="submit" disabled={busy}>{busy ? 'Working…' : 'Change password'}</Btn>
        </form>
      </Card>

      <Card className="mt-5">
        <h3 className="text-xs font-bold tracking-wide text-navy-700 uppercase">Security</h3>
        <ul className="mt-3 space-y-2 text-sm text-navy-600">
          <li>• PDFs are compressed (deflate) then encrypted with AES-256-GCM in your browser.</li>
          <li>• The encryption key is derived from your password (PBKDF2, 310,000 rounds).</li>
          <li>• Only encrypted blobs are uploaded — the cloud never sees your invoices.</li>
          <li>
            • If you ever forget your password, only your recovery phrase can unlock your
            invoices. Keep it safe — it was shown once at sign-up.
          </li>
        </ul>
      </Card>
    </div>
  )
}