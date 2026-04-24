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
  { key: 'proposal_number', label: 'Number', render: (v) => v || '-' },
  { key: 'opportunity_name', label: 'Opportunity', render: (v) => v || '-' },
  { key: 'account_name', label: 'Account', render: (v) => v || '-' },
  { key: 'proposal_date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'currency', label: 'Currency', render: (v) => v || '-' },
  { key: 'total_amount', label: 'Total Amount', filterKeys: ['one_time_amount', 'recurring_amount', 'implementation_amount', 'support_amount'], render: (_, r) => {
    const total = Number(r.one_time_amount || 0) + Number(r.recurring_amount || 0) + Number(r.implementation_amount || 0) + Number(r.support_amount || 0) - Number(r.discount_amount || 0)
    return total ? `$${Number(total).toLocaleString()}` : '-'
  }},
  { key: 'approval_status', label: 'Approval', render: (v) => v ? <StatusBadge status={v} /> : '-' },
]

const emptyForm = { opportunity_id: '', proposal_number: '', proposal_date: '', currency: 'USD', one_time_amount: '', recurring_amount: '', implementation_amount: '', support_amount: '', discount_amount: '', document_url: '', approval_status: '' }

export default function Proposals() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'proposals') || (user?.role === 'founding_orchestrator' ? 'tam' : 'ilgili')
  const isFullAccess = accessLevel === 'tam' || user?.role === 'founding_orchestrator'
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
      const res = await api.get('/proposals')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load proposals') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.proposal_number} ${r.opportunity_name} ${r.account_name} ${r.approval_status}`.toLowerCase().includes(s) })
  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ opportunity_id: row.opportunity_id || '', proposal_number: row.proposal_number || '', proposal_date: row.proposal_date ? row.proposal_date.split('T')[0] : '', currency: row.currency || 'USD', one_time_amount: row.one_time_amount || '', recurring_amount: row.recurring_amount || '', implementation_amount: row.implementation_amount || '', support_amount: row.support_amount || '', discount_amount: row.discount_amount || '', document_url: row.document_url || '', approval_status: row.approval_status || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm(`Delete proposal "${row.proposal_number}"?`)) return
    try { await api.delete(`/proposals/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) } catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { if (editMode && selected) { await api.put(`/proposals/${selected.id}`, form) } else { await api.post('/proposals', form) }; setShowForm(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    const total = Number(selected.one_time_amount || 0) + Number(selected.recurring_amount || 0) + Number(selected.implementation_amount || 0) + Number(selected.support_amount || 0) - Number(selected.discount_amount || 0)
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Proposals</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Proposal {selected.proposal_number}</h2>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>
              {isFullAccess && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Proposal Number', selected.proposal_number],
              ['Opportunity', selected.opportunity_name],
              ['Account', selected.account_name],
              ['Date', selected.proposal_date ? new Date(selected.proposal_date).toLocaleDateString() : null],
              ['Currency', selected.currency],
              ['Approval Status', selected.approval_status],
              ['Document URL', selected.document_url],
              ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
              ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-medium text-gray-500">{l}</p><p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p></div>
            ))}
          </div>
          {isFullAccess ? (
            <>
              <h3 className="mt-6 mb-3 text-lg font-semibold text-gray-900">Amount Breakdown</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[['One-Time', selected.one_time_amount], ['Recurring', selected.recurring_amount], ['Implementation', selected.implementation_amount], ['Support', selected.support_amount], ['Discount', selected.discount_amount]].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-medium text-gray-500">{l}</p><p className="mt-1 text-sm font-semibold text-gray-900">{v ? `$${Number(v).toLocaleString()}` : '$0'}</p></div>
                ))}
                <div className="rounded-lg bg-blue-50 p-3 border border-blue-200"><p className="text-xs font-medium text-blue-600">Total</p><p className="mt-1 text-sm font-bold text-blue-900">${total.toLocaleString()}</p></div>
              </div>
            </>
          ) : (
            <div className="mt-6">
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-200 inline-block"><p className="text-xs font-medium text-blue-600">Total Amount</p><p className="mt-1 text-sm font-bold text-blue-900">${total.toLocaleString()}</p></div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Proposals</h1><p className="text-sm text-gray-500">{filtered.length} proposal{filtered.length !== 1 ? 's' : ''}</p></div>
        <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Proposal</button>
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search proposals..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={isFullAccess ? handleDelete : undefined} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Proposal' : 'New Proposal'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Proposal Number *</label><input required value={form.proposal_number} onChange={e => setForm(p => ({ ...p, proposal_number: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Opportunity ID</label><input value={form.opportunity_id} onChange={e => setForm(p => ({ ...p, opportunity_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Proposal Date</label><input type="date" value={form.proposal_date} onChange={e => setForm(p => ({ ...p, proposal_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="TRY">TRY</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">One-Time Amount</label><input type="number" value={form.one_time_amount} onChange={e => setForm(p => ({ ...p, one_time_amount: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Recurring Amount</label><input type="number" value={form.recurring_amount} onChange={e => setForm(p => ({ ...p, recurring_amount: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Implementation</label><input type="number" value={form.implementation_amount} onChange={e => setForm(p => ({ ...p, implementation_amount: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Support</label><input type="number" value={form.support_amount} onChange={e => setForm(p => ({ ...p, support_amount: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Discount</label><input type="number" value={form.discount_amount} onChange={e => setForm(p => ({ ...p, discount_amount: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Document URL</label><input value={form.document_url} onChange={e => setForm(p => ({ ...p, document_url: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
            <select value={form.approval_status} onChange={e => setForm(p => ({ ...p, approval_status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Select...</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="revision">Revision</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editMode ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </DetailModal>
    </div>
  )
}
