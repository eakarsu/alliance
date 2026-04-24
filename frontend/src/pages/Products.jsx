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
  { key: 'product_name', label: 'Name', render: (v) => v || '-' },
  { key: 'category', label: 'Category', render: (v) => v || '-' },
  { key: 'owner_entity_name', label: 'Owner Entity', render: (v) => v || '-' },
  { key: 'owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'maturity_level', label: 'Maturity', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'demo_available', label: 'Demo', render: (v) => v ? 'Yes' : 'No' },
  { key: 'compliance_risk_level', label: 'Compliance Risk', render: (v) => v ? <StatusBadge status={v} /> : '-' },
]

const emptyForm = { product_name: '', category: '', owner_entity_id: '', owner_user_id: '', maturity_level: '', status: '', demo_available: false, recurring_model: false, white_label_possible: false, reseller_possible: false, implementation_required: false, compliance_risk_level: '', notes: '' }

export default function Products() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'products')
  const canEdit = !['us_market_bridge', 'restricted_external'].includes(user?.role)
  const canDelete = ['founding_orchestrator', 'solution_architect'].includes(user?.role)
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
      const res = await api.get('/products')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load products') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.product_name} ${r.category} ${r.status} ${r.owner_entity_name}`.toLowerCase().includes(s) })
  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ product_name: row.product_name || '', category: row.category || '', owner_entity_id: row.owner_entity_id || '', owner_user_id: row.owner_user_id || '', maturity_level: row.maturity_level || '', status: row.status || '', demo_available: !!row.demo_available, recurring_model: !!row.recurring_model, white_label_possible: !!row.white_label_possible, reseller_possible: !!row.reseller_possible, implementation_required: !!row.implementation_required, compliance_risk_level: row.compliance_risk_level || '', notes: row.notes || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm(`Delete product "${row.product_name}"?`)) return
    try { await api.delete(`/products/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) } catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { if (editMode && selected) { await api.put(`/products/${selected.id}`, form) } else { await api.post('/products', form) }; setShowForm(false); setSelected(null); fetchData() }
    catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Products</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.product_name}</h2>
            <div className="flex gap-2">
              {canEdit && <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>}
              {canDelete && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(() => {
              const allFields = [
                ['Category', selected.category],
                ['Owner Entity', selected.owner_entity_name],
                ['Owner', selected.owner_name],
                ['Maturity Level', selected.maturity_level],
                ['Status', selected.status],
                ['Demo Available', selected.demo_available ? 'Yes' : 'No'],
                ['Recurring Model', selected.recurring_model ? 'Yes' : 'No'],
                ['White Label', selected.white_label_possible ? 'Yes' : 'No'],
                ['Reseller Possible', selected.reseller_possible ? 'Yes' : 'No'],
                ['Implementation Required', selected.implementation_required ? 'Yes' : 'No'],
                ['Compliance Risk', selected.compliance_risk_level],
                ['Notes', selected.notes],
                ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
                ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
              ]
              const restrictedFields = ['Notes', 'Recurring Model', 'White Label', 'Reseller Possible', 'Implementation Required', 'Compliance Risk', 'Owner Entity']
              const detailFields = (accessLevel === 'ozet' || accessLevel === 'paylasilan')
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
        <div><h1 className="text-2xl font-bold text-gray-900">Products</h1><p className="text-sm text-gray-500">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</p></div>
        {canCreate && <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Product</button>}
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search products..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Product' : 'New Product'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label><input required value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Maturity Level</label>
              <select value={form.maturity_level} onChange={e => setForm(p => ({ ...p, maturity_level: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="concept">Concept</option><option value="development">Development</option><option value="beta">Beta</option><option value="ga">GA</option><option value="mature">Mature</option><option value="eol">EOL</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Owner Entity ID</label><input value={form.owner_entity_id} onChange={e => setForm(p => ({ ...p, owner_entity_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="draft">Draft</option><option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Compliance Risk</label>
              <select value={form.compliance_risk_level} onChange={e => setForm(p => ({ ...p, compliance_risk_level: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.demo_available} onChange={e => setForm(p => ({ ...p, demo_available: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Demo Available</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.recurring_model} onChange={e => setForm(p => ({ ...p, recurring_model: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Recurring Model</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.white_label_possible} onChange={e => setForm(p => ({ ...p, white_label_possible: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> White Label</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.reseller_possible} onChange={e => setForm(p => ({ ...p, reseller_possible: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Reseller Possible</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.implementation_required} onChange={e => setForm(p => ({ ...p, implementation_required: e.target.checked }))} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Implementation Required</label>
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
