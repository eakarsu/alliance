import { useState, useEffect } from 'react'
import { Plus, ArrowLeft, ShieldCheck } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import DetailModal from '../components/DetailModal'
import StatusBadge from '../components/StatusBadge'

const columns = [
  { key: 'related_type', label: 'Related Type', render: (v) => v || '-' },
  { key: 'related_id', label: 'Related ID', render: (v) => v != null ? v : '-' },
  { key: 'review_status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
  { key: 'reviewer_name', label: 'Reviewer', render: (v) => v || '-' },
  { key: 'personal_data_flag', label: 'Personal Data', render: (v) => v ? 'Yes' : 'No' },
  { key: 'eu_data_flag', label: 'EU Data', render: (v) => v ? 'Yes' : 'No' },
  { key: 'created_at', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const emptyForm = { related_type: 'opportunity', related_id: '', personal_data_flag: false, recording_flag: false, eu_data_flag: false, dpa_required_flag: false, security_review_flag: false, ip_license_required_flag: false, review_status: 'pending', notes: '' }

export default function ComplianceReviews() {
  const [data, setData] = useState([])
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
      const res = await api.get('/compliance-reviews')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
    } catch { setError('Failed to load compliance reviews') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.related_type} ${r.review_status} ${r.reviewer_name} ${r.notes}`.toLowerCase().includes(s) })
  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ related_type: row.related_type || 'opportunity', related_id: row.related_id || '', personal_data_flag: row.personal_data_flag || false, recording_flag: row.recording_flag || false, eu_data_flag: row.eu_data_flag || false, dpa_required_flag: row.dpa_required_flag || false, security_review_flag: row.security_review_flag || false, ip_license_required_flag: row.ip_license_required_flag || false, review_status: row.review_status || 'pending', notes: row.notes || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm('Delete this compliance review?')) return
    try { await api.delete(`/compliance-reviews/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) } catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { if (editMode && selected) { await api.put(`/compliance-reviews/${selected.id}`, form) } else { await api.post('/compliance-reviews', form) }; setShowForm(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Compliance Reviews</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Compliance Review #{selected.id}</h2>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>
              <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Related Type', selected.related_type],
              ['Related ID', selected.related_id],
              ['Status', selected.review_status],
              ['Reviewer', selected.reviewer_name],
              ['Personal Data', selected.personal_data_flag ? 'Yes' : 'No'],
              ['Recording', selected.recording_flag ? 'Yes' : 'No'],
              ['EU Data', selected.eu_data_flag ? 'Yes' : 'No'],
              ['DPA Required', selected.dpa_required_flag ? 'Yes' : 'No'],
              ['Security Review', selected.security_review_flag ? 'Yes' : 'No'],
              ['IP License Required', selected.ip_license_required_flag ? 'Yes' : 'No'],
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
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-blue-600" />
          <div><h1 className="text-2xl font-bold text-gray-900">Compliance Reviews</h1><p className="text-sm text-gray-500">{filtered.length} review{filtered.length !== 1 ? 's' : ''}</p></div>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Review</button>
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search compliance reviews..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Compliance Review' : 'New Compliance Review'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Related Type *</label>
              <select required value={form.related_type} onChange={e => setForm(p => ({ ...p, related_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="opportunity">Opportunity</option><option value="lead">Lead</option><option value="project">Project</option><option value="agreement">Agreement</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Related ID *</label><input required type="number" value={form.related_id} onChange={e => setForm(p => ({ ...p, related_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Review Status</label>
            <select value={form.review_status} onChange={e => setForm(p => ({ ...p, review_status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="pending">Pending</option><option value="in_review">In Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['personal_data_flag','Personal Data'],['recording_flag','Recording'],['eu_data_flag','EU Data'],['dpa_required_flag','DPA Required'],['security_review_flag','Security Review'],['ip_license_required_flag','IP License Required']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                {label}
              </label>
            ))}
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
