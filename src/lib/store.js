import { firebaseConfigured, getFirebase } from '../firebase'
import { setupUserKeys, unwrapMasterKey, rewrapMasterKey } from './keys'
import { bytesToBase64, base64ToBytes } from './crypto'

function encodePassword(password, saltB64) {
  return crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${saltB64}:${password}`),
  ).then((h) => bytesToBase64(new Uint8Array(h)))
}

/* ---------------- Local demo backend (no Firebase config) ---------------- */

const DEMO_PREFIX = 'mbdemo_'

function demoUsers() {
  return JSON.parse(localStorage.getItem(`${DEMO_PREFIX}users`) || '{}')
}

function demoSaveUsers(u) {
  localStorage.setItem(`${DEMO_PREFIX}users`, JSON.stringify(u))
}

function demoUserKey(email) {
  return `${DEMO_PREFIX}${email}_keys`
}

function demoInvoicesKey(email) {
  return `${DEMO_PREFIX}${email}_invoices`
}

function demoInvoices(email) {
  return JSON.parse(localStorage.getItem(demoInvoicesKey(email)) || '[]')
}

function demoRandomId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const demo = {
  name: 'demo',
  async signUp(email, password) {
    const users = demoUsers()
    if (users[email]) throw new Error('An account with this email already exists')
    const salt = crypto.randomUUID()
    const hash = await encodePassword(password, salt)
    users[email] = { salt, hash }
    demoSaveUsers(users)
    localStorage.setItem(`${DEMO_PREFIX}session`, email)
    const keys = await setupUserKeys(password)
    localStorage.setItem(demoUserKey(email), JSON.stringify(keys))
    localStorage.setItem(demoInvoicesKey(email), '[]')
    return { recovery: keys.recovery, masterKey: keys.masterKey }
  },
  async signIn(email, password) {
    const users = demoUsers()
    const user = users[email]
    if (!user) throw new Error('No account found with this email')
    const hash = await encodePassword(password, user.salt)
    if (hash !== user.hash) throw new Error('Incorrect password')
    localStorage.setItem(`${DEMO_PREFIX}session`, email)
    const stored = localStorage.getItem(demoUserKey(email))
    if (!stored) {
      const keys = await setupUserKeys(password)
      localStorage.setItem(demoUserKey(email), JSON.stringify(keys))
      localStorage.setItem(demoInvoicesKey(email), '[]')
      return { recovery: keys.recovery, masterKey: null }
    }
    const masterKey = await unwrapMasterKey(password, JSON.parse(stored).salt, JSON.parse(stored).wrappedKey)
    return { recovery: null, masterKey }
  },
  signOut() {
    localStorage.removeItem(`${DEMO_PREFIX}session`)
  },
  getCurrentUser() {
    const email = localStorage.getItem(`${DEMO_PREFIX}session`)
    return email ? { uid: email, email } : null
  },
  onAuthChange(cb) {
    const emit = () => cb(demo.getCurrentUser())
    emit()
    window.addEventListener('storage', emit)
    return () => window.removeEventListener('storage', emit)
  },
  async saveInvoice(record) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const list = demoInvoices(email)
    const meta = { ...record, blob: undefined }
    meta.id = record.id || demoRandomId()
    list.push({ ...meta, blobB64: bytesToBase64(record.blob) })
    localStorage.setItem(demoInvoicesKey(email), JSON.stringify(list))
    return meta
  },
  queryInvoices(filters = {}) {
    const email = this.getCurrentUser()?.email
    if (!email) return []
    let list = demoInvoices(email)
    if (filters.type) list = list.filter((i) => i.type === filters.type)
    if (filters.number) {
      const q = filters.number.trim().toLowerCase()
      list = list.filter((i) => i.number.toLowerCase().includes(q))
    }
    if (filters.from) list = list.filter((i) => i.date >= filters.from)
    if (filters.to) list = list.filter((i) => i.date <= filters.to)
    return list
      .map(({ blobB64: _blobB64, ...meta }) => meta)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },
  async getInvoice(id) {
    const email = this.getCurrentUser()?.email
    if (!email) return null
    const rec = demoInvoices(email).find((i) => i.id === id)
    if (!rec) return null
    const { blobB64, ...meta } = rec
    return { meta, blob: base64ToBytes(blobB64) }
  },
  async deleteInvoice(id) {
    const email = this.getCurrentUser()?.email
    if (!email) return
    const list = demoInvoices(email).filter((i) => i.id !== id)
    localStorage.setItem(demoInvoicesKey(email), JSON.stringify(list))
  },
  async changePassword(oldPassword, newPassword) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const users = demoUsers()
    const user = users[email]
    if (!user) throw new Error('No account found')
    const oldHash = await encodePassword(oldPassword, user.salt)
    if (oldHash !== user.hash) throw new Error('Current password is incorrect')
    const stored = JSON.parse(localStorage.getItem(demoUserKey(email)))
    const masterKey = await unwrapMasterKey(oldPassword, stored.salt, stored.wrappedKey)
    const newSalt = crypto.randomUUID()
    const newHash = await encodePassword(newPassword, newSalt)
    users[email] = { salt: newSalt, hash: newHash }
    demoSaveUsers(users)
    const rewrapped = await rewrapMasterKey(bytesToBase64(masterKey), newPassword)
    localStorage.setItem(demoUserKey(email), JSON.stringify(rewrapped))
  },
  async unlock(password) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const stored = JSON.parse(localStorage.getItem(demoUserKey(email)))
    return unwrapMasterKey(password, stored.salt, stored.wrappedKey)
  },
  getKeyMaterial() {
    const email = this.getCurrentUser()?.email
    if (!email) return null
    const stored = localStorage.getItem(demoUserKey(email))
    return stored ? JSON.parse(stored) : null
  },
}

/* ---------------- Firebase backend ---------------- */

async function fbCurrentUid() {
  const { auth } = await getFirebase()
  const user = auth.currentUser
  if (!user) throw new Error('Not signed in')
  return user.uid
}

const fb = {
  name: 'firebase',
  async signUp(email, password) {
    const { auth } = await getFirebase()
    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    const keys = await setupUserKeys(password)
    await this.setProfile(cred.user.uid, { salt: keys.salt, wrappedKey: keys.wrappedKey })
    return { recovery: keys.recovery, masterKey: keys.masterKey }
  },
  async signIn(email, password) {
    const { auth } = await getFirebase()
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const profile = await this.getProfile(cred.user.uid)
    if (!profile) {
      const keys = await setupUserKeys(password)
      await this.setProfile(cred.user.uid, { salt: keys.salt, wrappedKey: keys.wrappedKey })
      return { recovery: keys.recovery, masterKey: keys.masterKey }
    }
    const masterKey = await unwrapMasterKey(password, profile.salt, profile.wrappedKey)
    return { recovery: null, masterKey }
  },
  async signOut() {
    const { auth } = await getFirebase()
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
  },
  getCurrentUser() {
    return null
  },
  async onAuthChange(cb) {
    const { auth } = await getFirebase()
    const { onAuthStateChanged } = await import('firebase/auth')
    return onAuthStateChanged(auth, (u) =>
      cb(u ? { uid: u.uid, email: u.email } : null),
    )
  },
  async getProfile(uid) {
    const { db } = await getFirebase()
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? snap.data() : null
  },
  async setProfile(uid, data) {
    const { db } = await getFirebase()
    const { doc, setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, 'users', uid), data)
  },
  async saveInvoice(record) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, setDoc } = await import('firebase/firestore')
    const id = record.id || crypto.randomUUID()
    const meta = { ...record, blob: undefined, id }
    await setDoc(doc(db, 'users', uid, 'invoices', id), {
      number: meta.number,
      numberLower: meta.number.toLowerCase(),
      type: meta.type,
      client: meta.client || null,
      clientName: meta.client?.name || '',
      date: meta.date,
      dueDate: meta.dueDate,
      total: meta.total,
      costTotal: meta.costTotal || 0,
      createdAt: meta.createdAt,
      blob: record.blob,
    })
    return meta
  },
  async queryInvoices(filters = {}) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore')
    const q = query(
      collection(db, 'users', uid, 'invoices'),
      orderBy('createdAt', 'desc'),
      limit(1000),
    )
    const snap = await getDocs(q)
    let list = snap.docs.map((d) => {
      const { blob: _blob, ...rest } = d.data()
      return { id: d.id, ...rest }
    })
    if (filters.type) list = list.filter((i) => i.type === filters.type)
    if (filters.number) {
      const needle = filters.number.trim().toLowerCase()
      list = list.filter((i) => (i.numberLower || i.number.toLowerCase()).includes(needle))
    }
    if (filters.from) list = list.filter((i) => i.date >= filters.from)
    if (filters.to) list = list.filter((i) => i.date <= filters.to)
    return list
  },
  async getInvoice(id) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'users', uid, 'invoices', id))
    if (!snap.exists()) return null
    const data = snap.data()
    return { meta: { id, ...data, blob: undefined }, blob: new Uint8Array(data.blob) }
  },
  async deleteInvoice(id) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'users', uid, 'invoices', id))
  },
  async changePassword(oldPassword, newPassword) {
    const { auth } = await getFirebase()
    const { reauthenticateWithCredential, EmailAuthProvider, updatePassword } = await import('firebase/auth')
    const user = auth.currentUser
    if (!user) throw new Error('Not signed in')
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, oldPassword),
    )
    await updatePassword(user, newPassword)
    const uid = user.uid
    const profile = await this.getProfile(uid)
    const masterKey = await unwrapMasterKey(oldPassword, profile.salt, profile.wrappedKey)
    const rewrapped = await rewrapMasterKey(bytesToBase64(masterKey), newPassword)
    await this.setProfile(uid, rewrapped)
  },
  async unlock(password) {
    const uid = await fbCurrentUid()
    const profile = await this.getProfile(uid)
    if (!profile) throw new Error('No encryption keys found for this account')
    return unwrapMasterKey(password, profile.salt, profile.wrappedKey)
  },
  async getKeyMaterial() {
    const uid = await fbCurrentUid()
    return this.getProfile(uid)
  },
}

export const backend = firebaseConfigured ? fb : demo

export function backendName() {
  return backend.name
}

export function isDemoMode() {
  return backend.name === 'demo'
}