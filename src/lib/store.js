import { firebaseConfigured, getFirebase } from '../firebase'
import { setupUserKeys, unwrapMasterKey, rewrapMasterKey } from './keys'
import { bytesToBase64, base64ToBytes, encryptJson, decryptJson, getCryptoKey } from './crypto'
import { hasMasterKey } from './session'

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
  return `id-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
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
    const { masterKey, recovery, ...safe } = keys
    localStorage.setItem(demoUserKey(email), JSON.stringify(safe))
    localStorage.setItem(demoInvoicesKey(email), '[]')
    return { recovery, masterKey }
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
      const { masterKey: _mk, recovery: _rec, ...safe } = keys
      localStorage.setItem(demoUserKey(email), JSON.stringify(safe))
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
    const { client, paymentDetail, bankName, ...rest } = record
    const clean = { ...rest }
    clean.id = record.id || demoRandomId()
    clean.status = record.status || 'active'
    if (hasMasterKey()) {
      const key = await getCryptoKey()
      const sensitive = { client, paymentDetail, bankName }
      const enc = await encryptJson(key, sensitive)
      clean.sensitiveEnc = { iv: enc.iv, data: bytesToBase64(enc.data) }
    } else {
      clean.client = client
      clean.paymentDetail = paymentDetail
      clean.bankName = bankName
    }
    list.push({ ...clean, blobB64: bytesToBase64(record.blob) })
    localStorage.setItem(demoInvoicesKey(email), JSON.stringify(list))
    return { client, paymentDetail, bankName, ...rest, id: clean.id, status: clean.status }
  },
  async queryInvoices(filters = {}) {
    const email = this.getCurrentUser()?.email
    if (!email) return []
    const raw = demoInvoices(email)
    const cryptoKey = hasMasterKey() ? await getCryptoKey() : null
    let list = []
    for (const item of raw) {
      const out = { ...item }
      if (item.sensitiveEnc && cryptoKey) {
        try {
          const sensitive = await decryptJson(cryptoKey, item.sensitiveEnc.iv, base64ToBytes(item.sensitiveEnc.data))
          out.client = sensitive.client
          out.paymentDetail = sensitive.paymentDetail
          out.bankName = sensitive.bankName
        } catch { /* leave fields missing */ }
      }
      list.push(out)
    }
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
      .map(({ blobB64: _blobB64, sensitiveEnc: _se, ...meta }) => meta)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  },
  async getInvoice(id) {
    const email = this.getCurrentUser()?.email
    if (!email) return null
    const rec = demoInvoices(email).find((i) => i.id === id)
    if (!rec) return null
    const { blobB64, sensitiveEnc, ...meta } = rec
    if (sensitiveEnc && hasMasterKey()) {
      try {
        const key = await getCryptoKey()
        const sensitive = await decryptJson(key, sensitiveEnc.iv, base64ToBytes(sensitiveEnc.data))
        meta.client = sensitive.client
        meta.paymentDetail = sensitive.paymentDetail
        meta.bankName = sensitive.bankName
      } catch { /* leave fields missing */ }
    }
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
  async addPayment(invoiceId, payment) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const list = demoInvoices(email)
    const inv = list.find((i) => i.id === invoiceId)
    if (!inv) throw new Error('Invoice not found')
    const existing = inv.payments || []
    const totalPaid = existing.reduce((s, p) => s + (Number(p.amount) || 0), 0) + (Number(payment.amount) || 0)
    const total = Number(inv.total) || 0
    let paymentStatus = 'partial'
    if (totalPaid <= 0) paymentStatus = 'unpaid'
    else if (totalPaid >= total) paymentStatus = 'paid'
    inv.payments = [...existing, { ...payment, date: payment.date || new Date().toISOString().slice(0, 10), createdAt: Date.now() }]
    inv.paymentStatus = paymentStatus
    localStorage.setItem(demoInvoicesKey(email), JSON.stringify(list))
    return paymentStatus
  },
  async getPayments(invoiceId) {
    const email = this.getCurrentUser()?.email
    if (!email) return []
    const inv = demoInvoices(email).find((i) => i.id === invoiceId)
    return inv?.payments || []
  },
  async issueCreditNote(invoiceId, creditNote) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const list = demoInvoices(email)
    const inv = list.find((i) => i.id === invoiceId)
    if (!inv) throw new Error('Invoice not found')
    const existing = inv.creditNotes || []
    const totalCredited = existing.reduce((s, cn) => s + (Number(cn.amount) || 0), 0) + (Number(creditNote.amount) || 0)
    inv.creditNotes = [...existing, { ...creditNote, date: creditNote.date || new Date().toISOString().slice(0, 10), createdAt: Date.now() }]
    inv.totalCredited = totalCredited
    localStorage.setItem(demoInvoicesKey(email), JSON.stringify(list))
    return totalCredited
  },
  async getCreditNotes(invoiceId) {
    const email = this.getCurrentUser()?.email
    if (!email) return []
    const inv = demoInvoices(email).find((i) => i.id === invoiceId)
    return inv?.creditNotes || []
  },
  async saveContact(contact) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const list = demoContacts(email)
    const name = (contact.name || '').trim()
    const existing = list.find((c) => (c.name || '').trim().toLowerCase() === name.toLowerCase())
    const base = { nameLower: name.toLowerCase(), createdAt: Date.now() }
    let data
    if (hasMasterKey()) {
      const key = await getCryptoKey()
      const enc = await encryptJson(key, { name, phone: contact.phone || '', address: contact.address || '' })
      data = { ...base, sensitiveEnc: { iv: enc.iv, data: bytesToBase64(enc.data) } }
    } else {
      data = { ...base, name, phone: contact.phone || '', address: contact.address || '' }
    }
    if (existing) {
      Object.assign(existing, data)
    } else {
      list.push({ id: demoRandomId(), ...data })
    }
    localStorage.setItem(demoContactsKey(email), JSON.stringify(list))
    return { name, phone: contact.phone || '', address: contact.address || '', ...(existing || list[list.length - 1]) }
  },
  async queryContacts(search = '') {
    const email = this.getCurrentUser()?.email
    if (!email) return []
    const raw = demoContacts(email)
    const cryptoKey = hasMasterKey() ? await getCryptoKey() : null
    const decrypted = []
    for (const item of raw) {
      if (item.sensitiveEnc && cryptoKey) {
        try {
          const sensitive = await decryptJson(cryptoKey, item.sensitiveEnc.iv, base64ToBytes(item.sensitiveEnc.data))
          decrypted.push({ id: item.id, ...item, ...sensitive })
        } catch {
          const { sensitiveEnc: _se, ...rest } = item
          decrypted.push(rest)
        }
      } else {
        const { sensitiveEnc: _se, ...rest } = item
        decrypted.push(rest)
      }
    }
    const q = search.trim().toLowerCase()
    if (q) return decrypted.filter((c) => (c.name || '').toLowerCase().includes(q))
    return decrypted.sort((a, b) => (a.name < b.name ? -1 : 1))
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
      const { blobB64, sensitiveEnc: _se, ...meta } = rec
      return { meta, blob: base64ToBytes(blobB64) }
    })
  },
  async exportAllContacts() {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const raw = demoContacts(email)
    const cryptoKey = hasMasterKey() ? await getCryptoKey() : null
    if (!cryptoKey) return raw
    const out = []
    for (const item of raw) {
      if (item.sensitiveEnc) {
        try {
          const sensitive = await decryptJson(cryptoKey, item.sensitiveEnc.iv, base64ToBytes(item.sensitiveEnc.data))
          const { sensitiveEnc: _se, ...rest } = item
          out.push({ ...rest, ...sensitive })
        } catch {
          const { sensitiveEnc: _se, ...rest } = item
          out.push(rest)
        }
      } else {
        out.push(item)
      }
    }
    return out
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
  async getUsername() {
    const email = this.getCurrentUser()?.email
    if (!email) return ''
    return localStorage.getItem(`${DEMO_PREFIX}${email}_name`) || ''
  },
  async saveUsername(username) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const clean = (username || '').trim()
    if (clean.length > 40) throw new Error('Username must be 40 characters or fewer')
    localStorage.setItem(`${DEMO_PREFIX}${email}_name`, clean)
    return clean
  },
  async getCompanyProfiles() {
    const email = this.getCurrentUser()?.email
    if (!email) return {}
    const raw = localStorage.getItem(`${DEMO_PREFIX}${email}_company`)
    return raw ? JSON.parse(raw) : {}
  },
  async saveCompanyProfile(type, data) {
    const email = this.getCurrentUser()?.email
    if (!email) throw new Error('Not signed in')
    const current = await this.getCompanyProfiles()
    current[type] = data
    localStorage.setItem(`${DEMO_PREFIX}${email}_company`, JSON.stringify(current))
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
    await setDoc(doc(db, 'users', uid), data, { merge: true })
  },
  async saveInvoice(record) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, setDoc, Bytes } = await import('firebase/firestore')
    const id = record.id || crypto.randomUUID()
    const { blob: _blob, client, paymentDetail, bankName, ...rest } = record
    const clean = {}
    for (const key in rest) {
      if (rest[key] !== undefined) clean[key] = rest[key]
    }
    clean.id = id
    clean.numberLower = String(rest.number || '').toLowerCase()
    clean.blob = record.blob ? Bytes.fromUint8Array(record.blob) : null
    if (hasMasterKey()) {
      const key = await getCryptoKey()
      const sensitive = { client, paymentDetail, bankName }
      const enc = await encryptJson(key, sensitive)
      clean.sensitiveEnc = { iv: enc.iv, data: bytesToBase64(enc.data) }
    } else {
      clean.client = client
      clean.paymentDetail = paymentDetail
      clean.bankName = bankName
    }
    await setDoc(doc(db, 'users', uid, 'invoices', id), clean)
    return { client, paymentDetail, bankName, ...rest, id }
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
    const cryptoKey = hasMasterKey() ? await getCryptoKey() : null
    const raw = snap.docs.map((d) => {
      const { blob: _blob, ...rest } = d.data()
      return { id: d.id, ...rest }
    })
    let list = []
    for (const item of raw) {
      const out = { ...item }
      if (item.sensitiveEnc && cryptoKey) {
        try {
          const sensitive = await decryptJson(cryptoKey, item.sensitiveEnc.iv, base64ToBytes(item.sensitiveEnc.data))
          out.client = sensitive.client
          out.paymentDetail = sensitive.paymentDetail
          out.bankName = sensitive.bankName
        } catch { /* leave fields missing */ }
      }
      list.push(out)
    }
    list = list.filter((i) => {
      if (filters.type && i.type !== filters.type) return false
      if (filters.number) {
        const needle = filters.number.trim().toLowerCase()
        if (!(i.numberLower || i.number.toLowerCase()).includes(needle)) return false
      }
      if (filters.from && i.date < filters.from) return false
      if (filters.to && i.date > filters.to) return false
      if (filters.client) {
        const needle = filters.client.trim().toLowerCase()
        if (!(i.client?.name || i.clientName || '').toLowerCase().includes(needle)) return false
      }
      return true
    })
    return list
  },
  async getInvoice(id) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'users', uid, 'invoices', id))
    if (!snap.exists()) return null
    const data = snap.data()
    const { sensitiveEnc, ...meta } = data
    if (sensitiveEnc && hasMasterKey()) {
      try {
        const key = await getCryptoKey()
        const sensitive = await decryptJson(key, sensitiveEnc.iv, base64ToBytes(sensitiveEnc.data))
        meta.client = sensitive.client
        meta.paymentDetail = sensitive.paymentDetail
        meta.bankName = sensitive.bankName
      } catch { /* legacy or key mismatch — leave fields missing */ }
    }
    return { meta: { id, ...meta, blob: undefined }, blob: data.blob ? data.blob.toUint8Array() : null }
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
  async addPayment(invoiceId, payment) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, getDoc, updateDoc } = await import('firebase/firestore')
    const ref = doc(db, 'users', uid, 'invoices', invoiceId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Invoice not found')
    const data = snap.data()
    const existing = data.payments || []
    const totalPaid = existing.reduce((s, p) => s + (Number(p.amount) || 0), 0) + (Number(payment.amount) || 0)
    const total = Number(data.total) || 0
    let paymentStatus = 'partial'
    if (totalPaid <= 0) paymentStatus = 'unpaid'
    else if (totalPaid >= total) paymentStatus = 'paid'
    await updateDoc(ref, {
      payments: [...existing, { ...payment, date: payment.date || new Date().toISOString().slice(0, 10), createdAt: Date.now() }],
      paymentStatus,
    })
    return paymentStatus
  },
  async getPayments(invoiceId) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'users', uid, 'invoices', invoiceId))
    if (!snap.exists()) return []
    return snap.data().payments || []
  },
  async issueCreditNote(invoiceId, creditNote) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, getDoc, updateDoc } = await import('firebase/firestore')
    const ref = doc(db, 'users', uid, 'invoices', invoiceId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Invoice not found')
    const data = snap.data()
    const existing = data.creditNotes || []
    const totalCredited = existing.reduce((s, cn) => s + (Number(cn.amount) || 0), 0) + (Number(creditNote.amount) || 0)
    await updateDoc(ref, {
      creditNotes: [...existing, { ...creditNote, date: creditNote.date || new Date().toISOString().slice(0, 10), createdAt: Date.now() }],
      totalCredited,
    })
    return totalCredited
  },
  async getCreditNotes(invoiceId) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, getDoc } = await import('firebase/firestore')
    const snap = await getDoc(doc(db, 'users', uid, 'invoices', invoiceId))
    if (!snap.exists()) return []
    return snap.data().creditNotes || []
  },
  async saveContact(contact) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { collection, query, where, getDocs, addDoc, updateDoc } = await import('firebase/firestore')
    const name = (contact.name || '').trim()
    const col = collection(db, 'users', uid, 'contacts')
    const q = query(col, where('nameLower', '==', name.toLowerCase()))
    const snap = await getDocs(q)
    const base = { nameLower: name.toLowerCase(), createdAt: Date.now() }
    let data
    if (hasMasterKey()) {
      const key = await getCryptoKey()
      const enc = await encryptJson(key, { name, phone: contact.phone || '', address: contact.address || '' })
      data = { ...base, sensitiveEnc: { iv: enc.iv, data: bytesToBase64(enc.data) } }
    } else {
      data = { ...base, name, phone: contact.phone || '', address: contact.address || '' }
    }
    if (!snap.empty) {
      const ref = snap.docs[0].ref
      await updateDoc(ref, data)
      return { id: snap.docs[0].id, name, phone: contact.phone || '', address: contact.address || '', ...data }
    }
    const ref = await addDoc(col, data)
    return { id: ref.id, name, phone: contact.phone || '', address: contact.address || '', ...data }
  },
  async queryContacts(search = '') {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { collection, getDocs } = await import('firebase/firestore')
    const snap = await getDocs(collection(db, 'users', uid, 'contacts'))
    const masterKey = hasMasterKey() ? await getCryptoKey() : null
    const list = snap.docs.map((d) => {
      const data = d.data()
      if (data.sensitiveEnc && masterKey) {
        return { id: d.id, _encrypted: true, _sensitiveEnc: data.sensitiveEnc, ...data }
      }
      return { id: d.id, ...data }
    })
    const decrypted = []
    for (const item of list) {
      if (item._encrypted && masterKey) {
        try {
          const sensitive = await decryptJson(masterKey, item._sensitiveEnc.iv, base64ToBytes(item._sensitiveEnc.data))
          const { _encrypted, _sensitiveEnc, sensitiveEnc, ...rest } = item
          decrypted.push({ ...rest, ...sensitive })
        } catch {
          const { _encrypted, _sensitiveEnc, sensitiveEnc, ...rest } = item
          decrypted.push(rest)
        }
      } else {
        const { sensitiveEnc, ...rest } = item
        decrypted.push(rest)
      }
    }
    const q = search.trim().toLowerCase()
    if (q) return decrypted.filter((c) => (c.name || '').toLowerCase().includes(q))
    return decrypted.sort((a, b) => (a.name < b.name ? -1 : 1))
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
        const meta = { id: d.id, ...data, blob: undefined }
        if (meta.sensitiveEnc) delete meta.sensitiveEnc
        out.push({ meta, blob: data.blob ? data.blob.toUint8Array() : null })
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
    const masterKey = hasMasterKey() ? await getCryptoKey() : null
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    if (!masterKey) return list
    const out = []
    for (const item of list) {
      if (item.sensitiveEnc) {
        try {
          const sensitive = await decryptJson(masterKey, item.sensitiveEnc.iv, base64ToBytes(item.sensitiveEnc.data))
          const { sensitiveEnc, ...rest } = item
          out.push({ ...rest, ...sensitive })
        } catch {
          const { sensitiveEnc, ...rest } = item
          out.push(rest)
        }
      } else {
        out.push(item)
      }
    }
    return out
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
  async getUsername() {
    const uid = await fbCurrentUid()
    const profile = await this.getProfile(uid)
    return profile?.displayName || ''
  },
  async saveUsername(username) {
    const uid = await fbCurrentUid()
    const { db } = await getFirebase()
    const { doc, setDoc } = await import('firebase/firestore')
    const clean = (username || '').trim()
    if (clean.length > 40) throw new Error('Username must be 40 characters or fewer')
    await setDoc(doc(db, 'users', uid), { displayName: clean }, { merge: true })
    return clean
  },
  async getCompanyProfiles() {
    const uid = await fbCurrentUid()
    const profile = await this.getProfile(uid)
    return profile?.companyProfiles || {}
  },
  async saveCompanyProfile(type, data) {
    const uid = await fbCurrentUid()
    const current = await this.getCompanyProfiles()
    const { db } = await getFirebase()
    const { doc, setDoc } = await import('firebase/firestore')
    await setDoc(
      doc(db, 'users', uid),
      { companyProfiles: { ...current, [type]: data } },
      { merge: true },
    )
  },
}

const BRUTE_WINDOW = 15 * 60 * 1000
const BRUTE_LIMIT = 5

export async function checkBruteForce(email) {
  if (!firebaseConfigured) {
    const raw = localStorage.getItem(`${DEMO_PREFIX}brute_${email}`)
    if (!raw) return { blocked: false }
    const { count, lastAttempt } = JSON.parse(raw)
    if (Date.now() - lastAttempt > BRUTE_WINDOW) {
      localStorage.removeItem(`${DEMO_PREFIX}brute_${email}`)
      return { blocked: false }
    }
    if (count >= BRUTE_LIMIT) {
      const wait = Math.ceil((BRUTE_WINDOW - (Date.now() - lastAttempt)) / 1000)
      return { blocked: true, wait }
    }
    return { blocked: false }
  }
  return { blocked: false }
}

export async function recordFailedAttempt(email) {
  if (!firebaseConfigured) {
    const key = `${DEMO_PREFIX}brute_${email}`
    const raw = localStorage.getItem(key)
    const prev = raw ? JSON.parse(raw) : { count: 0, lastAttempt: 0 }
    if (Date.now() - prev.lastAttempt > BRUTE_WINDOW) {
      localStorage.setItem(key, JSON.stringify({ count: 1, lastAttempt: Date.now() }))
    } else {
      localStorage.setItem(key, JSON.stringify({ count: prev.count + 1, lastAttempt: Date.now() }))
    }
  }
}

export async function clearBruteForce(email) {
  if (!firebaseConfigured) {
    localStorage.removeItem(`${DEMO_PREFIX}brute_${email}`)
  }
}

export const backend = firebaseConfigured ? fb : demo

export function backendName() {
  return backend.name
}

export function isDemoMode() {
  return backend.name === 'demo'
}