import React, { useState } from 'react'
import JSZip from 'jszip'
import { backend, isDemoMode } from '../lib/store'
import { bytesToBase64 } from '../lib/crypto'
import { decryptToBlob, downloadBlob } from '../lib/invoiceCrypto'
import { Btn, Field, inputCls, Card, SectionTitle, ErrorBox } from '../components/ui'

export default function Settings({ user }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [backupBusy, setBackupBusy] = useState('')
  const [backupMsg, setBackupMsg] = useState('')
  const [backupError, setBackupError] = useState('')

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

  function stamp() {
    return new Date().toISOString().slice(0, 10)
  }

  async function exportJson() {
    setBackupBusy('Exporting JSON…')
    setBackupError('')
    setBackupMsg('')
    try {
      const all = await backend.exportAllInvoices()
      const invoices = all.map(({ meta, blob }) => ({
        ...meta,
        blobB64: blob ? bytesToBase64(blob) : null,
      }))
      const data = {
        version: 1,
        app: 'Megamind BD Invoice Manager',
        exportedAt: new Date().toISOString(),
        email: user?.email || '',
        invoices,
      }
      const json = JSON.stringify(data)
      const blob = new Blob([json], { type: 'application/json' })
      downloadBlob(blob, `megamind-bd-backup-${stamp()}.json`)
      setBackupMsg(`Backup downloaded with ${invoices.length} invoice${invoices.length === 1 ? '' : 's'} (includes encrypted PDF blobs).`)
    } catch (err) {
      setBackupError(err.message || 'Could not export backup')
    } finally {
      setBackupBusy('')
    }
  }

  async function exportZip() {
    setBackupBusy('Decrypting PDFs…')
    setBackupError('')
    setBackupMsg('')
    try {
      const all = await backend.exportAllInvoices()
      const zip = new JSZip()
      let count = 0
      for (const { meta, blob } of all) {
        if (!blob) continue
        const pdfBlob = await decryptToBlob(blob)
        const safe = (meta.number || `invoice-${meta.id || count}`).replace(/[^A-Za-z0-9_-]/g, '_')
        zip.file(`${safe}.pdf`, await pdfBlob.arrayBuffer())
        count++
      }
      const out = await zip.generateAsync({ type: 'blob' })
      downloadBlob(out, `megamind-pdfs-${stamp()}.zip`)
      setBackupMsg(`ZIP downloaded with ${count} PDF${count === 1 ? '' : 's'}.`)
    } catch (err) {
      setBackupError(err.message || 'Could not export PDFs')
    } finally {
      setBackupBusy('')
    }
  }

  async function deleteCloud() {
    if (!window.confirm(
      'Delete ALL cloud data? This permanently removes every encrypted PDF blob from cloud storage to free up space.\n\n' +
      'Make sure you downloaded a backup first — revenue data will only survive in your local backup file.',
    )) return
    setBackupBusy('Deleting cloud data…')
    setBackupError('')
    setBackupMsg('')
    try {
      const deleted = await backend.deleteAllCloudData()
      setBackupMsg(`Cloud storage cleared (${deleted} invoice${deleted === 1 ? '' : 's'} removed). Keep your backup file safe — it still contains all revenue data.`)
    } catch (err) {
      setBackupError(err.message || 'Could not delete cloud data')
    } finally {
      setBackupBusy('')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle sub="Account, security and storage status.">Settings</SectionTitle>

      <Card>
        <h3 className="text-xs font-bold tracking-wide text-navy-700 uppercase">Account</h3>
        <div className="mt-3">
          <span className="text-sm font-semibold break-all text-navy-900">{user?.email}</span>
        </div>
      </Card>

      <Card className="mt-5">
        <h3 className="text-xs font-bold tracking-wide text-navy-700 uppercase">Backup &amp; data</h3>
        <p className="mt-1 text-xs text-navy-500">
          Back up everything to your device before freeing up cloud storage. The JSON backup contains
          every invoice including its encrypted PDF; the ZIP contains readable PDFs you can open anytime.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn variant="outline" onClick={exportJson} disabled={!!backupBusy}>
            {backupBusy === 'Exporting JSON…' ? backupBusy : 'Export all data (JSON)'}
          </Btn>
          <Btn variant="outline" onClick={exportZip} disabled={!!backupBusy}>
            {backupBusy === 'Decrypting PDFs…' ? backupBusy : 'Export all PDFs (ZIP)'}
          </Btn>
          {!isDemoMode() && (
            <Btn variant="danger" onClick={deleteCloud} disabled={!!backupBusy}>
              {backupBusy === 'Deleting cloud data…' ? backupBusy : 'Delete cloud data'}
            </Btn>
          )}
        </div>
        {backupError && <ErrorBox>{backupError}</ErrorBox>}
        {backupMsg && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{backupMsg}</div>
        )}
        {isDemoMode() && (
          <p className="mt-3 text-xs text-navy-400">
            You are using browser storage, so there is no cloud data to delete. Backups still work.
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