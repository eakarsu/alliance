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
  { key: 'entity_name', label: 'Name', render: (v) => v || '-' },
  { key: 'entity_type', label: 'Type', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'geography', label: 'Geography', render: (v) => v || '-' },
  { key: 'active_status', label: 'Active', render: (v) => v ? 'Yes' : 'No' },
  { key: 'billing_capability', label: 'Billing Capability', render: (v) => v || '-' },
  { key: 'products_count', label: 'Products', render: (v) => v != null ? v : '-' },
  { key: 'opportunities_count', label: 'Opportunities', render: (v) => v != null ? v : '-' },
]

const emptyForm = { entity_name: '', entity_type: '', geography: '', billing_capability: '', active_status: true, contact_email: '', website: '', notes: '' }

export default function Partners() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'partners')
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
      const res = await api.get('/partners')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load partners') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.entity_name} ${r.entity_type} ${r.geography}`.toLowerCase().includes(s) })
  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ entity_name: row.entity_name || '', entity_type: row.entity_type || '', geography: row.geography || '', billing_capability: row.billing_capability || '', active_status: row.active_status !== false, contact_email: row.contact_email || '', website: row.website || '', notes: row.notes || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm(`Delete partner "${row.entity_name}"?`)) return
    try { await api.delete(`/partners/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) } catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { if (editMode && selected) { await api.put(`/partners/${selected.id}`, form) } else { await api.post('/partners', form) }; setShowForm(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Partners</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.entity_name}</h2>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>
              {!isRestricted && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(() => {
              const allFields = [
                ['Type', selected.entity_type],
                ['Geography', selected.geography],
                ['Active', selected.active_status ? 'Yes' : 'No'],
                ['Billing Capability', selected.billing_capability],
                ['Contact Email', selected.contact_email],
                ['Website', selected.website],
                ['Partnership Fee', selected.partnership_fee ? `$${Number(selected.partnership_fee).toLocaleString()}` : null],
                ['Revenue Share Default', selected.revenue_share_default != null ? `${selected.revenue_share_default}%` : null],
                ['Products Count', selected.products_count != null ? selected.products_count : null],
                ['Opportunities Count', selected.opportunities_count != null ? selected.opportunities_count : null],
                ['Notes', selected.notes],
                ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
                ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
              ]
              const restrictedFields = ['Partnership Fee', 'Revenue Share Default', 'Notes']
              const detailFields = isRestricted
                ? allFields.filter(([label]) => !restrictedFields.includes(label))
                : allFields
              return detailFields.map(([l, v]) => (
                <div key={l} className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-medium text-gray-500">{l}</p><p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p></div>
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
        <div><h1 className="text-2xl font-bold text-gray-900">Partners</h1><p className="text-sm text-gray-500">{filtered.length} partner{filtered.length !== 1 ? 's' : ''}</p></div>
        <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Partner</button>
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search partners..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={isRestricted ? undefined : handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Partner' : 'New Partner'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Entity Name *</label><input required value={form.entity_name} onChange={e => setForm(p => ({ ...p, entity_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select value={form.entity_type} onChange={e => setForm(p => ({ ...p, entity_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="reseller">Reseller</option><option value="distributor">Distributor</option><option value="technology">Technology</option><option value="consulting">Consulting</option><option value="implementation">Implementation</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Geography</label><input value={form.geography} onChange={e => setForm(p => ({ ...p, geography: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Billing Capability</label><input value={form.billing_capability} onChange={e => setForm(p => ({ ...p, billing_capability: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label><input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Website</label><input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.active_status} onChange={e => setForm(p => ({ ...p, active_status: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Active</label>
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
