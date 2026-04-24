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
  { key: 'activity_type', label: 'Type', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'summary', label: 'Summary', render: (v) => v || '-' },
  { key: 'owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'activity_date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'related_type', label: 'Related To', render: (v) => v || '-' },
  { key: 'private_flag', label: 'Private', render: (v) => v ? 'Yes' : 'No' },
]

const emptyForm = { activity_type: '', summary: '', activity_date: '', next_step: '', related_type: '', related_id: '', owner_user_id: '', private_flag: false }

export default function Activities() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'activities')
  const isReadOnly = accessLevel === 'paylasilan'
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
      const res = await api.get('/activities')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load activities') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.activity_type} ${r.summary} ${r.related_type} ${r.owner_name}`.toLowerCase().includes(s) })
  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ activity_type: row.activity_type || '', summary: row.summary || '', activity_date: row.activity_date ? row.activity_date.split('T')[0] : '', next_step: row.next_step || '', related_type: row.related_type || '', related_id: row.related_id || '', owner_user_id: row.owner_user_id || '', private_flag: !!row.private_flag })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm('Delete this activity?')) return
    try { await api.delete(`/activities/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) } catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { if (editMode && selected) { await api.put(`/activities/${selected.id}`, form) } else { await api.post('/activities', form) }; setShowForm(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Activities</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.summary || selected.activity_type || 'Activity'}</h2>
            <div className="flex gap-2">
              {!isReadOnly && <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>}
              {!isRestricted && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Type', selected.activity_type],
              ['Summary', selected.summary],
              ['Owner', selected.owner_name],
              ['Date', selected.activity_date ? new Date(selected.activity_date).toLocaleDateString() : null],
              ['Next Step', selected.next_step],
              ['Related Type', selected.related_type],
              ['Related ID', selected.related_id],
              ['Private', selected.private_flag ? 'Yes' : 'No'],
              ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-medium text-gray-500">{l}</p><p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Activities</h1><p className="text-sm text-gray-500">{filtered.length} activit{filtered.length !== 1 ? 'ies' : 'y'}</p></div>
        {!isReadOnly && <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Activity</button>}
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search activities..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={isReadOnly ? undefined : handleEdit} onDelete={isRestricted ? undefined : handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Activity' : 'New Activity'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Activity Type *</label>
            <select required value={form.activity_type} onChange={e => setForm(p => ({ ...p, activity_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option><option value="task">Task</option><option value="demo">Demo</option><option value="follow_up">Follow Up</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label><input required value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Activity Date</label><input type="date" value={form.activity_date} onChange={e => setForm(p => ({ ...p, activity_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Next Step</label><input value={form.next_step} onChange={e => setForm(p => ({ ...p, next_step: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Related Type</label>
              <select value={form.related_type} onChange={e => setForm(p => ({ ...p, related_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="contact">Contact</option><option value="lead">Lead</option><option value="opportunity">Opportunity</option><option value="organization">Organization</option><option value="project">Project</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Related ID</label><input value={form.related_id} onChange={e => setForm(p => ({ ...p, related_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Owner User ID</label><input value={form.owner_user_id} onChange={e => setForm(p => ({ ...p, owner_user_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.private_flag} onChange={e => setForm(p => ({ ...p, private_flag: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Private</label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editMode ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </DetailModal>
    </div>
  )
}
