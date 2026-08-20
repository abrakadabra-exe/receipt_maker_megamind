import React from 'react'
import {
  compressBytes,
  decompressBytes,
  encryptBytes,
  decryptBytes,
  bytesToBase64,
  base64ToBytes,
} from './crypto'
import { getMasterKey } from './session'

export async function getCryptoKey() {
  const raw = getMasterKey()
  if (!raw) throw new Error('Session locked. Please sign in again.')
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function buildEncryptedBlob(record) {
  const key = await getCryptoKey()
  const blob = await renderInvoicePdf(record)
  const raw = new Uint8Array(await blob.arrayBuffer())
  const compressed = compressBytes(raw)
  const { iv, data } = await encryptBytes(key, compressed)
  const out = new Uint8Array(12 + data.length)
  out.set(base64ToBytes(iv), 0)
  out.set(data, 12)
  return out
}

async function renderInvoicePdf(record) {
  const { pdf } = await import('@react-pdf/renderer')
  const { default: InvoiceDoc } = await import('./pdf.jsx')
  const { resolveCompanyProfile, toGrayscaleDataUrl } = await import('./companyProfiles')
  const profile = await resolveCompanyProfile(record.type)
  if (profile.logoSrc && !profile.logoOnDark) {
    profile.logoSrc = await toGrayscaleDataUrl(profile.logoSrc)
  }
  return pdf(<InvoiceDoc invoice={record} profile={profile} />).toBlob()
}

export async function buildPdfBlob(record) {
  return renderInvoicePdf(record)
}

export async function decryptToBlob(encrypted) {
  const key = await getCryptoKey()
  const iv = bytesToBase64(encrypted.slice(0, 12))
  const ct = encrypted.slice(12)
  const plaintext = await decryptBytes(key, iv, ct)
  const raw = decompressBytes(plaintext)
  return new Blob([raw], { type: 'application/pdf' })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function openBlob(blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}