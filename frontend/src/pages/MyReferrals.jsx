import { useState, useEffect } from 'react'
import { Plus, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'
import DetailModal from '../components/DetailModal'

const columns = [
  { key: 'lead_name', label: 'Lead Name', render: (v) => v || '-' },
  { key: 'org_name', label: 'Organization', render: (v) => v || '-' },
  { key: 'geography', label: 'Geography', render: (v) => v || '-' },
  { key: 'estimated_value', label: 'Value', render: (v) => v ? `$${Number(v).toLocaleString()}` : '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  {
    key: 'opportunity_name',
    label: 'Opportunity',
    render: (v, row) => v ? (
      <div>
        <p className="text-sm text-gray-900">{v}</p>
        {row.opportunity_value && <p className="text-xs text-gray-500">${Number(row.opportunity_value).toLocaleString()}</p>}
        {row.stage_name && <p className="text-xs text-gray-400">{row.stage_name}</p>}
      </div>
    ) : '-',
  },
  { key: 'created_at', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const emptyForm = {
  lead_name: '',
  organization_id: '',
  contact_id: '',
  geography: '',
  vertical: '',
  need_type: '',
  estimated_value: '',
  notes: '',
}

export default function MyReferrals() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [contacts, setContacts] = useState([])

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const refRes = await api.get('/referrals/my-referrals')
      const items = refRes.data.data || []
      setData(Array.isArray(items) ? items : [])
    } catch {
      setError('Failed to load referrals')
    } finally {
      setLoading(false)
    }
    // Load orgs/contacts for the form (non-critical, may 403 for some roles)
    try {
      const orgRes = await api.get('/organizations')
      const orgs = orgRes.data.data || orgRes.data || []
      setOrganizations(Array.isArray(orgs) ? orgs : [])
    } catch {}
    try {
      const contactRes = await api.get('/contacts')
      const cts = contactRes.data.data || contactRes.data || []
      setContacts(Array.isArray(cts) ? cts : [])
    } catch {}
  }

  const filtered = data.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.lead_name} ${r.org_name} ${r.geography} ${r.status} ${r.contact_name}`.toLowerCase().includes(s)
  })

  const handleNew = () => {
    setForm(emptyForm)
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/referrals/submit-lead', {
        ...form,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        organization_id: form.organization_id || null,
        contact_id: form.contact_id || null,
      })
      setShowForm(false)
      setForm(emptyForm)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit referral')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to My Referrals
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-gray-900">{selected.lead_name}</h2>
            {selected.status && <StatusBadge status={selected.status} />}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Organization', selected.org_name],
              ['Contact', selected.contact_name],
              ['Geography', selected.geography],
              ['Vertical', selected.vertical],
              ['Need Type', selected.need_type],
              ['Estimated Value', selected.estimated_value ? `$${Number(selected.estimated_value).toLocaleString()}` : null],
              ['Source Type', selected.source_type],
              ['Status', selected.status],
              ['Opportunity', selected.opportunity_name],
              ['Opportunity Value', selected.opportunity_value ? `$${Number(selected.opportunity_value).toLocaleString()}` : null],
              ['Stage', selected.stage_name],
              ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{l}</p>
                <p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p>
              </div>
            ))}
          </div>
          {selected.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selected.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Referrals</h1>
          <p className="text-sm text-gray-500">{filtered.length} referral{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Submit New Referral
        </button>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search referrals..." />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <DataTable columns={columns} data={filtered} onRowClick={(row) => setSelected(row)} />

      <DetailModal open={showForm} onClose={() => setShowForm(false)} title="Submit New Referral">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Name *</label>
            <input required value={form.lead_name} onChange={(e) => setForm((p) => ({ ...p, lead_name: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
              <select value={form.organization_id} onChange={(e) => setForm((p) => ({ ...p, organization_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.org_name || o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
              <select value={form.contact_id} onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">Select...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.contact_name || c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim()}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geography</label>
              <input value={form.geography} onChange={(e) => setForm((p) => ({ ...p, geography: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vertical</label>
              <input value={form.vertical} onChange={(e) => setForm((p) => ({ ...p, vertical: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Need Type</label>
              <input value={form.need_type} onChange={(e) => setForm((p) => ({ ...p, need_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Value</label>
              <input type="number" value={form.estimated_value} onChange={(e) => setForm((p) => ({ ...p, estimated_value: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Submitting...' : 'Submit Referral'}</button>
          </div>
        </form>
      </DetailModal>
    </div>
  )
}
