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
  { key: 'org_name', label: 'Name', render: (v) => v || '-' },
  { key: 'org_type', label: 'Type', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'country', label: 'Country', render: (v) => v || '-' },
  { key: 'industry', label: 'Industry', render: (v) => v || '-' },
  { key: 'owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'contacts_count', label: 'Contacts', render: (v) => v != null ? v : '-' },
  { key: 'visibility_level', label: 'Visibility', render: (v) => v ? <StatusBadge status={v} /> : '-' },
]

const emptyForm = { org_name: '', org_type: '', country: '', website: '', industry: '', employee_count: '', owner_user_id: '', visibility_level: '', notes: '' }

export default function Organizations() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'organizations')
  const isRestricted = accessLevel === 'ilgili' || accessLevel === 'sinirli' || accessLevel === 'paylasilan' || accessLevel === 'yok'
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await api.get('/organizations')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load organizations') }
    finally { setLoading(false) }
  }

  const filtered = data.filter(r => {
    const s = search.toLowerCase()
    return !s || `${r.org_name} ${r.country} ${r.industry} ${r.org_type}`.toLowerCase().includes(s)
  })

  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }

  const handleEdit = (row) => {
    setForm({ org_name: row.org_name || '', org_type: row.org_type || '', country: row.country || '', website: row.website || '', industry: row.industry || '', employee_count: row.employee_count || '', owner_user_id: row.owner_user_id || '', visibility_level: row.visibility_level || '', notes: row.notes || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }

  const handleDelete = async (row) => {
    if (!confirm(`Delete organization "${row.org_name}"?`)) return
    try { await api.delete(`/organizations/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) }
    catch { alert('Failed to delete') }
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editMode && selected) { await api.put(`/organizations/${selected.id}`, form) }
      else { await api.post('/organizations', form) }
      setShowForm(false); setSelected(null); fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Organizations</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.org_name}</h2>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>
              {!isRestricted && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(() => {
              const allFields = [
                ['Type', selected.org_type],
                ['Country', selected.country],
                ['Website', selected.website],
                ['Industry', selected.industry],
                ['Employee Count', selected.employee_count],
                ['Owner', selected.owner_name],
                ['Contacts Count', selected.contacts_count != null ? selected.contacts_count : null],
                ['Visibility', selected.visibility_level],
                ['Notes', selected.notes],
                ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
                ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
              ]
              const restrictedFields = ['Notes', 'Visibility']
              const detailFields = isRestricted
                ? allFields.filter(([label]) => !restrictedFields.includes(label))
                : allFields
              return detailFields.map(([label, val]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-1 text-sm text-gray-900">{val != null && val !== '' ? String(val) : '-'}</p></div>
              ))
            })()}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Organizations</h1><p className="text-sm text-gray-500">{filtered.length} organization{filtered.length !== 1 ? 's' : ''}</p></div>
        <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Organization</button>
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search organizations..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={isRestricted ? undefined : handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Organization' : 'New Organization'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label><input required value={form.org_name} onChange={e => setForm(p => ({ ...p, org_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.org_type} onChange={e => setForm(p => ({ ...p, org_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="customer">Customer</option><option value="partner">Partner</option><option value="vendor">Vendor</option><option value="prospect">Prospect</option><option value="competitor">Competitor</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Country</label><input value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Industry</label><input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Employee Count</label><input type="number" value={form.employee_count} onChange={e => setForm(p => ({ ...p, employee_count: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select value={form.visibility_level} onChange={e => setForm(p => ({ ...p, visibility_level: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option><option value="public">Public</option><option value="internal">Internal</option><option value="restricted">Restricted</option><option value="confidential">Confidential</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editMode ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </DetailModal>
    </div>
  )
}
