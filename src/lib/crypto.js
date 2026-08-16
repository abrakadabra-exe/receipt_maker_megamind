import { deflate, inflate } from 'pako'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function bytesToBase64(bytes) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export function base64ToBytes(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export async function deriveKey(password, saltB64) {
  const salt = base64ToBytes(saltB64)
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function randomSalt() {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))
}

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n))
}

export async function encryptBytes(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { iv: bytesToBase64(iv), data: new Uint8Array(ct) }
}

export async function decryptBytes(key, ivB64, ciphertext) {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivB64) },
    key,
    ciphertext,
  )
  return new Uint8Array(pt)
}

export function compressBytes(bytes) {
  return deflate(bytes)
}

export function decompressBytes(bytes) {
  return inflate(bytes)
}

export function bytesToText(bytes) {
  return decoder.decode(bytes)
}