import React, { useEffect, useState } from 'react'
import { backend } from '../lib/store'
import { Btn, Field, inputCls, Card, SectionTitle, ErrorBox } from '../components/ui'

export default function Contacts() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load(q = search) {
    setError('')
    try {
      const list = await backend.queryContacts(q)
      setRows(list)
    } catch (err) {
      setError(err.message || 'Could not load contacts')
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startEdit(c) {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone || '', address: c.address || '' })
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Contact name is required'); return }
    setBusy(true)
    setError('')
    try {
      await backend.saveContact(form)
      setEditing(null)
      setForm({ name: '', phone: '', address: '' })
      await load()
    } catch (err) {
      setError(err.message || 'Could not save contact')
    } finally {
      setBusy(false)
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete contact "${c.name}"?`)) return
    setError('')
    try {
      await backend.deleteContact(c.id)
      await load()
    } catch (err) {
      setError(err.message || 'Could not delete contact')
    }
  }

  return (
    <div>
      <SectionTitle sub="Manage your saved clients. They auto-fill when you create a new invoice.">
        Contacts
      </SectionTitle>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:flex-1">
            <Field label="Search contacts">
              <input
                className={inputCls}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); load(search) } }}
                placeholder="Type a name and press Enter…"
              />
            </Field>
          </div>
          <Btn onClick={() => load(search)}>Search</Btn>
        </div>
      </Card>

      <ErrorBox>{error}</ErrorBox>

      <div className="mt-5 space-y-3">
        {loaded && rows.length === 0 && (
          <Card className="text-center text-sm text-navy-500">
            No contacts yet. They are saved automatically whenever you create an invoice.
          </Card>
        )}
        {rows.map((c) => (
          <Card key={c.id} className="!p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-900">{c.name}</p>
                <p className="mt-0.5 text-xs text-navy-500">
                  {c.phone || '—'}
                  {c.address ? ` · ${c.address}` : ''}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Btn variant="outline" className="!px-3 !py-2 text-sm" onClick={() => startEdit(c)}>Edit</Btn>
                <Btn variant="danger" className="!px-3 !py-2 text-sm" onClick={() => remove(c)}>Delete</Btn>
              </div>
            </div>

            {editing && editing.id === c.id && (
              <form onSubmit={saveEdit} className="mt-3 space-y-3 border-t border-navy-100 pt-3">
                <Field label="Name">
                  <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Phone">
                    <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+880…" />
                  </Field>
                  <Field label="Address">
                    <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save contact'}</Btn>
                  <Btn type="button" variant="ghost" onClick={() => { setEditing(null); setForm({ name: '', phone: '', address: '' }) }}>Cancel</Btn>
                </div>
              </form>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}