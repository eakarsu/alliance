import { useState, useEffect } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import DetailModal from '../components/DetailModal'
import { useAuth } from '../context/AuthContext'

const columns = [
  { key: 'user_name', label: 'User', render: (v, r) => v || `User ${r.user_id}` || '-' },
  { key: 'contribution_type', label: 'Type', render: (v) => v || '-' },
  { key: 'related_type', label: 'Related Type', render: (v) => v || '-' },
  { key: 'metric_name', label: 'Metric', render: (v) => v || '-' },
  { key: 'metric_value', label: 'Value', render: (v) => v != null ? v : '-' },
  { key: 'period_start', label: 'Period', render: (v, r) => {
    const start = v ? new Date(v).toLocaleDateString() : ''
    const end = r.period_end ? new Date(r.period_end).toLocaleDateString() : ''
    return start && end ? `${start} - ${end}` : start || '-'
  }},
]

const emptyForm = { user_id: '', contribution_type: '', metric_name: '', metric_value: '', period_start: '', period_end: '', related_type: '', related_id: '', notes: '' }

export default function KPI() {
  const { user } = useAuth()
  const isGovernance = user?.role === 'founding_orchestrator'
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
      const res = await api.get('/kpi')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load KPI contributions') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.contribution_type} ${r.metric_name} ${r.user_name} ${r.related_type}`.toLowerCase().includes(s) })
  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ user_id: row.user_id || '', contribution_type: row.contribution_type || '', metric_name: row.metric_name || '', metric_value: row.metric_value || '', period_start: row.period_start ? row.period_start.split('T')[0] : '', period_end: row.period_end ? row.period_end.split('T')[0] : '', related_type: row.related_type || '', related_id: row.related_id || '', notes: row.notes || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm('Delete this KPI contribution?')) return
    try { await api.delete(`/kpi/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) } catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { if (editMode && selected) { await api.put(`/kpi/${selected.id}`, form) } else { await api.post('/kpi', form) }; setShowForm(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to KPI Contributions</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.metric_name || 'KPI Contribution'}</h2>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>
              {isGovernance && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['User', selected.user_name || `User ${selected.user_id}`],
              ['Contribution Type', selected.contribution_type],
              ['Related Type', selected.related_type],
              ['Related ID', selected.related_id],
              ['Metric Name', selected.metric_name],
              ['Metric Value', selected.metric_value],
              ['Period Start', selected.period_start ? new Date(selected.period_start).toLocaleDateString() : null],
              ['Period End', selected.period_end ? new Date(selected.period_end).toLocaleDateString() : null],
              ['Notes', selected.notes],
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
        <div><h1 className="text-2xl font-bold text-gray-900">{isGovernance ? 'KPI Contributions' : 'My KPIs'}</h1><p className="text-sm text-gray-500">{filtered.length} contribution{filtered.length !== 1 ? 's' : ''}</p></div>
        <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Contribution</button>
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search KPI contributions..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={isGovernance ? handleDelete : undefined} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit KPI Contribution' : 'New KPI Contribution'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">User ID *</label><input required value={form.user_id} onChange={e => setForm(p => ({ ...p, user_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Contribution Type *</label>
            <select required value={form.contribution_type} onChange={e => setForm(p => ({ ...p, contribution_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option><option value="revenue">Revenue</option><option value="deal_closed">Deal Closed</option><option value="lead_generated">Lead Generated</option><option value="partner_onboarded">Partner Onboarded</option><option value="project_delivered">Project Delivered</option><option value="customer_satisfaction">Customer Satisfaction</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Metric Name *</label><input required value={form.metric_name} onChange={e => setForm(p => ({ ...p, metric_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Metric Value *</label><input required value={form.metric_value} onChange={e => setForm(p => ({ ...p, metric_value: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label><input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period End</label><input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Related Type</label>
              <select value={form.related_type} onChange={e => setForm(p => ({ ...p, related_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="opportunity">Opportunity</option><option value="lead">Lead</option><option value="project">Project</option><option value="partner">Partner</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Related ID</label><input value={form.related_id} onChange={e => setForm(p => ({ ...p, related_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
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
