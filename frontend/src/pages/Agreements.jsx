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
  { key: 'agreement_type', label: 'Type', render: (v) => v || '-' },
  { key: 'related_type', label: 'Related Type', render: (v) => v || '-' },
  { key: 'party_1', label: 'Party 1', render: (v) => v || '-' },
  { key: 'party_2', label: 'Party 2', render: (v) => v || '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'start_date', label: 'Start Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'end_date', label: 'End Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'governing_law', label: 'Governing Law', render: (v) => v || '-' },
]

const emptyForm = { agreement_type: '', related_type: '', related_id: '', party_1: '', party_2: '', start_date: '', end_date: '', status: '', document_url: '', governing_law: '', renewal_date: '', notes: '' }

export default function Agreements() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'agreements')
  const canEdit = !['us_market_bridge', 'restricted_external'].includes(user?.role)
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
      const res = await api.get('/agreements')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load agreements') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.agreement_type} ${r.party_1} ${r.party_2} ${r.status}`.toLowerCase().includes(s) })
  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ agreement_type: row.agreement_type || '', related_type: row.related_type || '', related_id: row.related_id || '', party_1: row.party_1 || '', party_2: row.party_2 || '', start_date: row.start_date ? row.start_date.split('T')[0] : '', end_date: row.end_date ? row.end_date.split('T')[0] : '', status: row.status || '', document_url: row.document_url || '', governing_law: row.governing_law || '', renewal_date: row.renewal_date ? row.renewal_date.split('T')[0] : '', notes: row.notes || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm('Delete this agreement?')) return
    try { await api.delete(`/agreements/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) } catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { if (editMode && selected) { await api.put(`/agreements/${selected.id}`, form) } else { await api.post('/agreements', form) }; setShowForm(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Agreements</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.agreement_type || 'Agreement'}</h2>
            <div className="flex gap-2">
              {canEdit && <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>}
              {canDelete && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(() => {
              const allFields = [
                ['Type', selected.agreement_type],
                ['Related Type', selected.related_type],
                ['Related ID', selected.related_id],
                ['Party 1', selected.party_1],
                ['Party 2', selected.party_2],
                ['Status', selected.status],
                ['Start Date', selected.start_date ? new Date(selected.start_date).toLocaleDateString() : null],
                ['End Date', selected.end_date ? new Date(selected.end_date).toLocaleDateString() : null],
                ['Renewal Date', selected.renewal_date ? new Date(selected.renewal_date).toLocaleDateString() : null],
                ['Document URL', selected.document_url],
                ['Governing Law', selected.governing_law],
                ['Notes', selected.notes],
                ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
                ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
              ]
              const restrictedFields = ['Document URL', 'Governing Law', 'Renewal Date', 'Notes']
              const detailFields = (accessLevel === 'paylasilan' || accessLevel === 'sinirli')
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
        <div><h1 className="text-2xl font-bold text-gray-900">Agreements</h1><p className="text-sm text-gray-500">{filtered.length} agreement{filtered.length !== 1 ? 's' : ''}</p></div>
        {canCreate && <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Agreement</button>}
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search agreements..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Agreement' : 'New Agreement'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Agreement Type *</label>
            <select required value={form.agreement_type} onChange={e => setForm(p => ({ ...p, agreement_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option><option value="NDA">NDA</option><option value="MSA">MSA</option><option value="SOW">SOW</option><option value="Partnership">Partnership</option><option value="License">License</option><option value="SLA">SLA</option><option value="Other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Related Type</label>
              <select value={form.related_type} onChange={e => setForm(p => ({ ...p, related_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="opportunity">Opportunity</option><option value="partner">Partner</option><option value="project">Project</option><option value="organization">Organization</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Related ID</label><input value={form.related_id} onChange={e => setForm(p => ({ ...p, related_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Party 1 *</label><input required value={form.party_1} onChange={e => setForm(p => ({ ...p, party_1: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Party 2 *</label><input required value={form.party_2} onChange={e => setForm(p => ({ ...p, party_2: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label><input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date</label><input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label><input type="date" value={form.renewal_date} onChange={e => setForm(p => ({ ...p, renewal_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option><option value="terminated">Terminated</option><option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Document URL</label><input value={form.document_url} onChange={e => setForm(p => ({ ...p, document_url: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Governing Law</label><input value={form.governing_law} onChange={e => setForm(p => ({ ...p, governing_law: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
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
