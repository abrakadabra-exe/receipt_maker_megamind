import {
  deriveKey,
  randomSalt,
  randomBytes,
  encryptBytes,
  decryptBytes,
  bytesToBase64,
  base64ToBytes,
} from './crypto'

export async function setupUserKeys(password) {
  const salt = randomSalt()
  const key = await deriveKey(password, salt)
  const masterKey = randomBytes(32)
  const wrapped = await encryptBytes(key, masterKey)
  return {
    salt,
    wrappedKey: { iv: wrapped.iv, data: bytesToBase64(wrapped.data) },
    recovery: bytesToBase64(masterKey),
    masterKey,
  }
}

export async function unwrapMasterKey(password, salt, wrappedKey) {
  const key = await deriveKey(password, salt)
  return decryptBytes(key, wrappedKey.iv, base64ToBytes(wrappedKey.data))
}

export async function rewrapMasterKey(recoveryPhrase, newPassword) {
  const masterKey = base64ToBytes(recoveryPhrase.trim())
  if (masterKey.length !== 32) throw new Error('Recovery phrase is invalid')
  const salt = randomSalt()
  const key = await deriveKey(newPassword, salt)
  const wrapped = await encryptBytes(key, masterKey)
  return {
    salt,
    wrappedKey: { iv: wrapped.iv, data: bytesToBase64(wrapped.data) },
  }
}