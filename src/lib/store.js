import { firebaseConfigured, getFirebase } from '../firebase'
import { setupUserKeys, unwrapMasterKey, rewrapMasterKey } from './keys'
import { bytesToBase64, base64ToBytes } from './crypto'

function encodePassword(password, saltB64) {
  return crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${saltB64}:${password}`),
  ).then((h) => bytesToBase64(new Uint8Array(h)))
}

async function encodePasswordPbkdf2(password, saltB64) {
  const salt = base64ToBytes(saltB64)
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
    baseKey,
    256,
  )
  return `pbkdf2$${bytesToBase64(new Uint8Array(bits))}`
}

async function verifyPassword(email, password, salt, storedHash) {
  if (storedHash && storedHash.startsWith('pbkdf2$')) {
    return (await encodePasswordPbkdf2(password, salt)) === storedHash
  }
  const legacy = await encodePassword(password, salt)
  return legacy === storedHash
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

function demoContactsKey(email) {
  return `${DEMO_PREFIX}${email}_contacts`
}

function demoContacts(email) {
  return JSON.parse(localStorage.getItem(demoContactsKey(email)) || '[]')
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
    const hash = await encodePasswordPbkdf2(password, salt)
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
    if (!user) throw new Error('Invalid email or password')
    if (!(await verifyPassword(email, password, user.salt, user.hash))) {
      throw new Error('Invalid email or password')
    }
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
    meta.status = record.status || 'active'
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
    if (filters.client) {
      const q = filters.client.trim().toLowerCase()
      list = list.filter((i) => (i.client?.name || i.clientName || '').toLowerCase().includes(q))
    }
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
  async cancelInvoice(id) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const list = demoInvoices(email).map((i) =>
      i.id === id ? { ...i, status: 'cancelled' } : i,
    )
    localStorage.setItem(demoInvoicesKey(email), JSON.stringify(list))
  },
  async saveContact(contact) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const list = demoContacts(email)
    const existing = list.find((c) => c.name.trim().toLowerCase() === (contact.name || '').trim().toLowerCase())
    if (existing) {
      Object.assign(existing, { phone: contact.phone || '', address: contact.address || '' })
    } else {
      list.push({
        id: demoRandomId(),
        name: (contact.name || '').trim(),
        phone: contact.phone || '',
        address: contact.address || '',
        createdAt: Date.now(),
      })
    }
    localStorage.setItem(demoContactsKey(email), JSON.stringify(list))
    return existing || list[list.length - 1]
  },
  async queryContacts(search = '') {
    const email = this.getCurrentUser()?.email
    if (!email) return []
    let list = demoContacts(email)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((c) => (c.name || '').toLowerCase().includes(q))
    return list.sort((a, b) => (a.name < b.name ? -1 : 1))
  },
  async deleteContact(id) {
    const email = this.getCurrentUser()?.email
    if (!email) return
    const list = demoContacts(email).filter((c) => c.id !== id)
    localStorage.setItem(demoContactsKey(email), JSON.stringify(list))
  },
  async exportAllInvoices() {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    return demoInvoices(email).map((rec) => {
      const { blobB64, ...meta } = rec
      return { meta, blob: base64ToBytes(blobB64) }
    })
  },
  async exportAllContacts() {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    return demoContacts(email)
  },
  async importFromBackup(data) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    let imported = 0
    let skipped = 0
    let contacts = 0
    const existing = demoInvoices(email)
    const existingIds = new Set(existing.map((i) => i.id))
    for (const inv of (data.invoices || [])) {
      if (!inv || !inv.blobB64) { skipped++; continue }
      if (existingIds.has(inv.id)) { skipped++; continue }
      const { blobB64, ...meta } = inv
      await this.saveInvoice({ ...meta, blob: base64ToBytes(blobB64) })
      existingIds.add(inv.id)
      imported++
    }
    for (const c of (data.contacts || [])) {
      if (!c || !c.name) continue
      await this.saveContact({ name: c.name, phone: c.phone, address: c.address })
      contacts++
    }
    return { imported, skipped, contacts }
  },
  async deleteAllCloudData() {
    return 0
  },
  async changePassword(oldPassword, newPassword) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const users = demoUsers()
    const user = users[email]
    if (!user) throw new Error('No account found')
    if (!(await verifyPassword(email, oldPassword, user.salt, user.hash))) throw new Error('Current password is incorrect')
    const stored = JSON.parse(localStorage.getItem(demoUserKey(email)))
    const masterKey = await unwrapMasterKey(oldPassword, stored.salt, stored.wrappedKey)
    const newSalt = crypto.randomUUID()
    const newHash = await encodePasswordPbkdf2(newPassword, newSalt)
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
    let cred
    try {
      cred = await signInWithEmailAndPassword(auth, email, password)
    } catch {
      throw new Error('Invalid email or password')
    }
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
  async getCurrentUser() {
    const { auth } = await getFirebase()
    const u = auth.currentUser
    return u ? { uid: u.uid, email: u.email } : null
  },
  async onAuthChange(cb) {
    const { auth } = await getFirebase()
    const { onAuthStateChanged } = await import('firebase/auth')
    let unsub = null
    const setup = onAuthStateChanged(auth, (u) =>
      cb(u ? { uid: u.uid, email: u.email } : null),
    )
    if (typeof setup === 'function') unsub = setup
    else {
      const p = Promise.resolve(setup)
      unsub = () => p.then((fn) => typeof fn === 'function' && fn())
    }
    return () => { try { unsub() } catch { /* noop */ } }
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
    const { doc, setDoc, Bytes } = await import('firebase/firestore')
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
      status: meta.status || 'active',
      paymentMethod: meta.paymentMethod || '',
      paymentDetail: meta.paymentDetail || '',
      bankName: meta.bankName || '',
      createdAt: meta.createdAt,
      blob: record.blob ? Bytes.fromUint8Array(record.blob) : null,
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
    if (filters.client) {
      const q = filters.client.trim().toLowerCase()
      list = list.filter((i) => (i.client?.name || i.clientName || '').toLowerCase().includes(q))
    }
    return list
  },
  async getInvoice(id) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'users', uid, 'invoices', id))
    if (!snap.exists()) return null
    const data = snap.data()
    return { meta: { id, ...data, blob: undefined }, blob: data.blob ? data.blob.toUint8Array() : null }
  },
  async deleteInvoice(id) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'users', uid, 'invoices', id))
  },
  async cancelInvoice(id) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, updateDoc } = await import('firebase/firestore')
    await updateDoc(doc(db, 'users', uid, 'invoices', id), { status: 'cancelled' })
  },
  async saveContact(contact) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { collection, query, where, getDocs, addDoc, updateDoc } = await import('firebase/firestore')
    const name = (contact.name || '').trim()
    const col = collection(db, 'users', uid, 'contacts')
    const q = query(col, where('nameLower', '==', name.toLowerCase()))
    const snap = await getDocs(q)
    const data = {
      name,
      nameLower: name.toLowerCase(),
      phone: contact.phone || '',
      address: contact.address || '',
      createdAt: Date.now(),
    }
    if (!snap.empty) {
      const ref = snap.docs[0].ref
      await updateDoc(ref, { name, nameLower: name.toLowerCase(), phone: data.phone, address: data.address })
      return { id: snap.docs[0].id, ...data }
    }
    const ref = await addDoc(col, data)
    return { id: ref.id, ...data }
  },
  async queryContacts(search = '') {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { collection, getDocs } = await import('firebase/firestore')
    const snap = await getDocs(collection(db, 'users', uid, 'contacts'))
    let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const q = search.trim().toLowerCase()
    if (q) list = list.filter((c) => (c.name || '').toLowerCase().includes(q))
    return list.sort((a, b) => (a.name < b.name ? -1 : 1))
  },
  async deleteContact(id) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'users', uid, 'contacts', id))
  },
  async exportAllInvoices() {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { collection, query, orderBy, limit, startAfter, getDocs } = await import('firebase/firestore')
    const out = []
    let cursor = null
    for (;;) {
      const q = cursor
        ? query(collection(db, 'users', uid, 'invoices'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(1000))
        : query(collection(db, 'users', uid, 'invoices'), orderBy('createdAt', 'desc'), limit(1000))
      const snap = await getDocs(q)
      if (snap.empty) break
      for (const d of snap.docs) {
        const data = d.data()
        out.push({
          meta: { id: d.id, ...data, blob: undefined },
          blob: data.blob ? data.blob.toUint8Array() : null,
        })
      }
      if (snap.docs.length < 1000) break
      cursor = snap.docs[snap.docs.length - 1]
    }
    return out
  },
  async exportAllContacts() {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { collection, getDocs } = await import('firebase/firestore')
    const snap = await getDocs(collection(db, 'users', uid, 'contacts'))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },
  async importFromBackup(data) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, getDoc } = await import('firebase/firestore')
    let imported = 0
    let skipped = 0
    let contacts = 0
    for (const inv of (data.invoices || [])) {
      if (!inv || !inv.blobB64) { skipped++; continue }
      if (inv.id && (await getDoc(doc(db, 'users', uid, 'invoices', inv.id))).exists()) { skipped++; continue }
      const { blobB64, ...meta } = inv
      await this.saveInvoice({ ...meta, blob: base64ToBytes(blobB64) })
      imported++
    }
    for (const c of (data.contacts || [])) {
      if (!c || !c.name) continue
      await this.saveContact({ name: c.name, phone: c.phone, address: c.address })
      contacts++
    }
    return { imported, skipped, contacts }
  },
  async deleteAllCloudData() {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { collection, query, orderBy, limit, getDocs, writeBatch } = await import('firebase/firestore')
    const col = collection(db, 'users', uid, 'invoices')
    let deleted = 0
    for (;;) {
      const q = query(col, orderBy('createdAt', 'desc'), limit(1000))
      const snap = await getDocs(q)
      if (snap.empty) break
      const batch = writeBatch(db)
      for (const d of snap.docs) batch.delete(d.ref)
      await batch.commit()
      deleted += snap.docs.length
      if (snap.docs.length < 1000) break
    }
    return deleted
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