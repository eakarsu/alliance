import { useState, useEffect } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'
import DetailModal from '../components/DetailModal'
import { useAuth } from '../context/AuthContext'
import { getAccessDepth } from '../config/rolePermissions'

const columns = [
  { key: 'name', label: 'Name', filterKeys: ['first_name', 'last_name'], render: (_, r) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || '-' },
  { key: 'email', label: 'Email', render: (v) => v || '-' },
  { key: 'org_name', label: 'Organization', render: (v) => v || '-' },
  { key: 'title', label: 'Title', render: (v) => v || '-' },
  { key: 'owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'trust_level', label: 'Trust Level', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'consent_status', label: 'Consent', render: (v) => v ? <StatusBadge status={v} /> : '-' },
]

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', title: '', linkedin_url: '', organization_id: '', owner_user_id: '', trust_level: '', visibility_level: '', consent_status: '', notes: '', known_by_user_id: '' }

export default function Contacts() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'contacts')
  const isRestricted = accessLevel === 'ilgili' || accessLevel === 'sinirli' || accessLevel === 'paylasilan' || accessLevel === 'yok'
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [orgs, setOrgs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchData(); fetchOrgs(); fetchUsers() }, [])

  const fetchData = async () => {
    try {
      const res = await api.get('/contacts')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load contacts') }
    finally { setLoading(false) }
  }

  const fetchOrgs = async () => {
    try {
      const res = await api.get('/organizations')
      const items = res.data.data || []
      setOrgs(Array.isArray(items) ? items : [])
    } catch {}
  }

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/list')
      setUsers(Array.isArray(res.data) ? res.data : [])
    } catch {}
  }

  const filtered = data.filter(r => {
    const s = search.toLowerCase()
    return !s || `${r.first_name} ${r.last_name} ${r.email} ${r.title} ${r.org_name}`.toLowerCase().includes(s)
  })

  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }

  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }

  const handleEdit = (row) => {
    setForm({
      first_name: row.first_name || '', last_name: row.last_name || '', email: row.email || '',
      phone: row.phone || '', title: row.title || '', linkedin_url: row.linkedin_url || '',
      organization_id: row.organization_id || '', owner_user_id: row.owner_user_id || '',
      trust_level: row.trust_level || '', visibility_level: row.visibility_level || '',
      consent_status: row.consent_status || '', notes: row.notes || '', known_by_user_id: ''
    })
    setEditMode(true)
    setShowForm(true)
    setSelected(row)
  }

  const handleDelete = async (row) => {
    if (!confirm(`Delete contact "${row.first_name} ${row.last_name}"?`)) return
    try {
      await api.delete(`/contacts/${row.id}`)
      setData(prev => prev.filter(r => r.id !== row.id))
      if (selected?.id === row.id) setSelected(null)
    } catch { alert('Failed to delete contact') }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editMode && selected) {
        await api.put(`/contacts/${selected.id}`, form)
      } else {
        await api.post('/contacts', form)
      }
      setShowForm(false)
      setSelected(null)
      fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>
  }

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Contacts
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.first_name} {selected.last_name}</h2>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>
              {!isRestricted && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(() => {
              const allFields = [
                ['Email', selected.email],
                ['Phone', selected.phone],
                ['Title', selected.title],
                ['LinkedIn', selected.linkedin_url],
                ['Organization', selected.org_name],
                ['Owner', selected.owner_name],
                ['Trust Level', selected.trust_level],
                ['Visibility', selected.visibility_level],
                ['Consent Status', selected.consent_status],
                ['Notes', selected.notes],
                ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
                ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
              ]
              const restrictedFields = ['Notes', 'Visibility']
              const detailFields = isRestricted
                ? allFields.filter(([label]) => !restrictedFields.includes(label))
                : allFields
              return detailFields.map(([label, val]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-900">{val || '-'}</p>
                </div>
              ))
            })()}
          </div>

          {/* Relationship Links (known_by / trust_level) */}
          {selected.relationships && selected.relationships.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Relationship Links</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Known By</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Trust Level</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Intro Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Intro Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selected.relationships.map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900">{r.known_by_name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{r.trust_level?.replace(/_/g, ' ') || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{r.intro_type?.replace(/_/g, ' ') || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{r.intro_owner_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500">{filtered.length} contact{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> New Contact
        </button>
      </div>

      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search contacts..." /></div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={isRestricted ? undefined : handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Contact' : 'New Contact'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input required value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input required value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
            <input value={form.linkedin_url} onChange={e => setForm(p => ({ ...p, linkedin_url: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
            <select value={form.organization_id} onChange={e => setForm(p => ({ ...p, organization_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select organization...</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.org_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Known By (Relationship Link)</label>
            <select value={form.known_by_user_id} onChange={e => setForm(p => ({ ...p, known_by_user_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select user...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trust Level</label>
              <select value={form.trust_level} onChange={e => setForm(p => ({ ...p, trust_level: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="trusted">Trusted</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select value={form.visibility_level} onChange={e => setForm(p => ({ ...p, visibility_level: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option>
                <option value="public">Public</option><option value="internal">Internal</option><option value="restricted">Restricted</option><option value="confidential">Confidential</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Consent Status</label>
            <select value={form.consent_status} onChange={e => setForm(p => ({ ...p, consent_status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option>
              <option value="pending">Pending</option><option value="granted">Granted</option><option value="denied">Denied</option><option value="withdrawn">Withdrawn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : editMode ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </DetailModal>
    </div>
  )
}
