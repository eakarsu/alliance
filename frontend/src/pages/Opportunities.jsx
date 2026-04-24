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
  { key: 'opportunity_name', label: 'Name', render: (v) => v || '-' },
  { key: 'stage_name', label: 'Stage', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'deal_type', label: 'Deal Type', render: (v) => v || '-' },
  { key: 'account_name', label: 'Account', render: (v) => v || '-' },
  { key: 'deal_owner_name', label: 'Deal Owner', render: (v) => v || '-' },
  { key: 'estimated_total_value', label: 'Total Value', render: (v) => v ? `$${Number(v).toLocaleString()}` : '-' },
  { key: 'win_probability', label: 'Win Prob.', render: (v) => v != null ? `${v}%` : '-' },
  { key: 'expected_close_date', label: 'Close Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const emptyForm = { opportunity_name: '', lead_id: '', deal_type: '', estimated_total_value: '', recurring_value: '', one_time_value: '', expected_close_date: '', visibility_level: '', compliance_review_status: '', win_probability: '', pipeline_id: '', stage_id: '', account_org_id: '', deal_owner_user_id: '', source_owner_user_id: '', sponsor_user_id: '', technical_partner_user_id: '', product_owner_user_id: '', delivery_owner_user_id: '', billing_entity_id: '', notes: '' }

export default function Opportunities() {
  const { user } = useAuth()
  const accessLevel = getAccessDepth(user?.role, 'opportunities')
  const canEdit = ['founding_orchestrator', 'solution_architect', 'enterprise_partner', 'product_experience_lead', 'product_partner'].includes(user?.role)
  const canDelete = user?.role === 'founding_orchestrator'
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
      const res = await api.get('/opportunities')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
    } catch { setError('Failed to load opportunities') } finally { setLoading(false) }
  }

  const filtered = data.filter(r => { const s = search.toLowerCase(); return !s || `${r.opportunity_name} ${r.deal_type} ${r.stage_name} ${r.account_name}`.toLowerCase().includes(s) })

  const handleRowClick = (row) => { setSelected(row); setEditMode(false) }
  const handleNew = () => { setForm(emptyForm); setEditMode(false); setShowForm(true); setSelected(null) }
  const handleEdit = (row) => {
    setForm({ opportunity_name: row.opportunity_name || '', lead_id: row.lead_id || '', deal_type: row.deal_type || '', estimated_total_value: row.estimated_total_value || '', recurring_value: row.recurring_value || '', one_time_value: row.one_time_value || '', expected_close_date: row.expected_close_date ? row.expected_close_date.split('T')[0] : '', visibility_level: row.visibility_level || '', compliance_review_status: row.compliance_review_status || '', win_probability: row.win_probability || '', pipeline_id: row.pipeline_id || '', stage_id: row.stage_id || '', account_org_id: row.account_org_id || '', deal_owner_user_id: row.deal_owner_user_id || '', source_owner_user_id: row.source_owner_user_id || '', sponsor_user_id: row.sponsor_user_id || '', technical_partner_user_id: row.technical_partner_user_id || '', product_owner_user_id: row.product_owner_user_id || '', delivery_owner_user_id: row.delivery_owner_user_id || '', billing_entity_id: row.billing_entity_id || '', notes: row.notes || '' })
    setEditMode(true); setShowForm(true); setSelected(row)
  }
  const handleDelete = async (row) => {
    if (!confirm(`Delete opportunity "${row.opportunity_name}"?`)) return
    try { await api.delete(`/opportunities/${row.id}`); setData(prev => prev.filter(r => r.id !== row.id)); if (selected?.id === row.id) setSelected(null) }
    catch { alert('Failed to delete') }
  }
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editMode && selected) { await api.put(`/opportunities/${selected.id}`, form) } else { await api.post('/opportunities', form) }
      setShowForm(false); setSelected(null); fetchData()
    } catch (err) { alert(err.response?.data?.error || 'Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected && !showForm) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Opportunities</button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.opportunity_name}</h2>
            <div className="flex gap-2">
              {canEdit && <button onClick={() => handleEdit(selected)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Edit</button>}
              {canDelete && <button onClick={() => handleDelete(selected)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Delete</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(() => {
              const allFields = [
                ['Deal Type', selected.deal_type],
                ['Stage', selected.stage_name],
                ['Pipeline', selected.pipeline_name],
                ['Account', selected.account_name],
                ['Deal Owner', selected.deal_owner_name],
                ['Source Owner', selected.source_owner_name],
                ['Sponsor', selected.sponsor_name],
                ['Technical Partner', selected.technical_partner_name],
                ['Product Owner', selected.product_owner_name],
                ['Delivery Owner', selected.delivery_owner_name],
                ['Deal Path', selected.deal_path_name],
                ['Billing Entity', selected.billing_entity_name],
                ['Total Value', selected.estimated_total_value ? `$${Number(selected.estimated_total_value).toLocaleString()}` : null],
                ['Recurring Value', selected.recurring_value ? `$${Number(selected.recurring_value).toLocaleString()}` : null],
                ['One-Time Value', selected.one_time_value ? `$${Number(selected.one_time_value).toLocaleString()}` : null],
                ['Win Probability', selected.win_probability != null ? `${selected.win_probability}%` : null],
                ['Close Date', selected.expected_close_date ? new Date(selected.expected_close_date).toLocaleDateString() : null],
                ['Compliance Review', selected.compliance_review_status],
                ['Visibility', selected.visibility_level],
                ['Notes', selected.notes],
                ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
                ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
              ]
              const restrictedFields = ['Pipeline', 'Billing Entity', 'Compliance Review', 'Visibility', 'Notes', 'Recurring Value', 'One-Time Value']
              const detailFields = (accessLevel === 'tam' || accessLevel === 'gorevli')
                ? allFields
                : allFields.filter(([label]) => !restrictedFields.includes(label))
              return detailFields.map(([l, v]) => (
                <div key={l} className="rounded-lg bg-gray-50 p-3"><p className="text-xs font-medium text-gray-500">{l}</p><p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p></div>
              ))
            })()}
          </div>

          {/* Opportunity Roles */}
          {selected.opportunity_roles && selected.opportunity_roles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Opportunity Roles</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selected.opportunity_roles.map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900">{r.user_name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{r.role_in_opportunity?.replace(/_/g, ' ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Revenue Shares (tam/gorevli access only) */}
          {(accessLevel === 'tam' || accessLevel === 'gorevli') && selected.revenue_shares && selected.revenue_shares.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Revenue Shares</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Beneficiary</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Share %</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selected.revenue_shares.map((rs, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900">{rs.beneficiary_name || rs.beneficiary_entity_name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{rs.share_percent != null ? `${rs.share_percent}%` : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{rs.calc_amount ? `$${Number(rs.calc_amount).toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{rs.payout_status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Proposals */}
          {selected.proposals && selected.proposals.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Proposals</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Number</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selected.proposals.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900">{p.proposal_number || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{p.proposal_date ? new Date(p.proposal_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{p.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Activities */}
          {selected.activities && selected.activities.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Activities</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Owner</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selected.activities.map((a, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm text-gray-900">{a.activity_type?.replace(/_/g, ' ') || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{a.activity_date ? new Date(a.activity_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{a.owner_name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">{a.notes || '-'}</td>
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
        <div><h1 className="text-2xl font-bold text-gray-900">Opportunities</h1><p className="text-sm text-gray-500">{filtered.length} opportunit{filtered.length !== 1 ? 'ies' : 'y'}</p></div>
        {canCreate && <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> New Opportunity</button>}
      </div>
      <div className="max-w-sm"><SearchBar value={search} onChange={setSearch} placeholder="Search opportunities..." /></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} onEdit={handleEdit} onDelete={handleDelete} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title={editMode ? 'Edit Opportunity' : 'New Opportunity'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label><input required value={form.opportunity_name} onChange={e => setForm(p => ({ ...p, opportunity_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Deal Type</label>
              <select value={form.deal_type} onChange={e => setForm(p => ({ ...p, deal_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="new_business">New Business</option><option value="expansion">Expansion</option><option value="renewal">Renewal</option><option value="upsell">Upsell</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Win Probability (%)</label><input type="number" min="0" max="100" value={form.win_probability} onChange={e => setForm(p => ({ ...p, win_probability: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Value</label><input type="number" value={form.estimated_total_value} onChange={e => setForm(p => ({ ...p, estimated_total_value: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Recurring Value</label><input type="number" value={form.recurring_value} onChange={e => setForm(p => ({ ...p, recurring_value: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">One-Time Value</label><input type="number" value={form.one_time_value} onChange={e => setForm(p => ({ ...p, one_time_value: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label><input type="date" value={form.expected_close_date} onChange={e => setForm(p => ({ ...p, expected_close_date: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Lead ID</label><input value={form.lead_id} onChange={e => setForm(p => ({ ...p, lead_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Org ID</label><input value={form.account_org_id} onChange={e => setForm(p => ({ ...p, account_org_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Billing Entity ID</label><input value={form.billing_entity_id} onChange={e => setForm(p => ({ ...p, billing_entity_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select value={form.visibility_level} onChange={e => setForm(p => ({ ...p, visibility_level: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="public">Public</option><option value="internal">Internal</option><option value="restricted">Restricted</option><option value="confidential">Confidential</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Compliance Review</label>
              <select value={form.compliance_review_status} onChange={e => setForm(p => ({ ...p, compliance_review_status: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="not_required">Not Required</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Technical Partner ID</label><input value={form.technical_partner_user_id} onChange={e => setForm(p => ({ ...p, technical_partner_user_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Product Owner ID</label><input value={form.product_owner_user_id} onChange={e => setForm(p => ({ ...p, product_owner_user_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Delivery Owner ID</label><input value={form.delivery_owner_user_id} onChange={e => setForm(p => ({ ...p, delivery_owner_user_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" /></div>
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
