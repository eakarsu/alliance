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
  { key: 'project_name', label: 'Name', render: (v) => v || '-' },
  { key: 'opportunity_name', label: 'Opportunity', render: (v) => v || '-' },
  { key: 'project_owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'start_date', label: 'Start Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'target_end_date', label: 'End Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'budget', label: 'Budget', render: (v) => v ? `$${Number(v).toLocaleString()}` : '-' },
]

const emptyForm = { project_name: '', opportunity_id: '', project_owner_user_id: '', delivery_manager_user_id: '', technical_lead_user_id: '', status: '', start_date: '', target_end_date: '', support_end_date: '', budget: '', scope_version: '', notes: '' }

export default function Projects() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'projects')
  const canEdit = ['founding_orchestrator', 'pmo_coordinator', 'solution_architect'].includes(user?.role)
  const canDelete = ['founding_orchestrator', 'pmo_coordinator'].includes(user?.role)
  const canCreate = canEdit
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
      const res = await api.get('/projects')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load projects') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.project_name} ${r.status} ${r.opportunity_name} ${r.project_owner_name}`.toLowerCase().includes(s) })
  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ project_name: row.project_name || '', opportunity_id: row.opportunity_id || '', project_owner_user_id: row.project_owner_user_id || '', delivery_manager_user_id: row.delivery_manager_user_id || '', technical_lead_user_id: row.technical_lead_user_id || '', status: row.status || '', start_date: row.start_date ? row.start_date.split('T')[0] : '', target_end_date: row.target_end_date ? row.target_end_date.split('T')[0] : '', support_end_date: row.support_end_date ? row.support_end_date.split('T')[0] : '', budget: row.budget || '', scope_version: row.scope_version || '', notes: row.notes || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm(`Delete project "${row.project_name}"?`)) return
    try { await api.delete(`/projects/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) } catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { if (editMode && selected) { await api.put(`/projects/${selected.id}`, form) } else { await api.post('/projects', form) }; setShowForm(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Projects</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.project_name}</h2>
            <div className="flex gap-2">
              {canEdit && <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>}
              {canDelete && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(() => {
              const allFields = [
                ['Opportunity', selected.opportunity_name],
                ['Project Owner', selected.project_owner_name],
                ['Delivery Manager', selected.delivery_manager_name],
                ['Technical Lead', selected.technical_lead_name],
                ['Status', selected.status],
                ['Start Date', selected.start_date ? new Date(selected.start_date).toLocaleDateString() : null],
                ['Target End Date', selected.target_end_date ? new Date(selected.target_end_date).toLocaleDateString() : null],
                ['Support End Date', selected.support_end_date ? new Date(selected.support_end_date).toLocaleDateString() : null],
                ['Budget', selected.budget ? `$${Number(selected.budget).toLocaleString()}` : null],
                ['Scope Version', selected.scope_version],
                ['Notes', selected.notes],
                ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
                ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
              ]
              const restrictedFields = ['Budget', 'Scope Version', 'Support End Date', 'Notes']
              const detailFields = (accessLevel === 'ozet' || accessLevel === 'sinirli')
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
        <div><h1 className="text-2xl font-bold text-gray-900">Projects</h1><p className="text-sm text-gray-500">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</p></div>
        {canCreate && <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Project</button>}
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search projects..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Project' : 'New Project'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label><input required value={form.project_name} onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Opportunity ID</label><input value={form.opportunity_id} onChange={e => setForm(p => ({ ...p, opportunity_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option><option value="planning">Planning</option><option value="in_progress">In Progress</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Target End Date</label><input type="date" value={form.target_end_date} onChange={e => setForm(p => ({ ...p, target_end_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Support End Date</label><input type="date" value={form.support_end_date} onChange={e => setForm(p => ({ ...p, support_end_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Budget</label><input type="number" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Scope Version</label><input value={form.scope_version} onChange={e => setForm(p => ({ ...p, scope_version: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
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
