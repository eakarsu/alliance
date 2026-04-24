import { useState, useEffect } from 'react'
import { Activity, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

const columns = [
  { key: 'lead_name', label: 'Lead Name', render: (v) => v || 'Unnamed Lead' },
  { key: 'lead_status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'org_name', label: 'Organization', render: (v) => v || '-' },
  { key: 'estimated_value', label: 'Value', render: (v) => v != null && v !== '' ? `$${Number(v).toLocaleString()}` : '-' },
  { key: 'opportunity_name', label: 'Opportunity', render: (v) => v || '-' },
  { key: 'stage_name', label: 'Stage', render: (v) => v || '-' },
  { key: 'expected_close_date', label: 'Close Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'is_closed_won', label: 'Won', render: (v) => v ? 'Yes' : 'No' },
]

export default function StatusTracker() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/referrals/status-tracker')
        const items = res.data.data || []
        setData(Array.isArray(items) ? items : [])
      } catch {
        setError('Failed to load status tracker')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = data.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.lead_name} ${r.lead_status} ${r.org_name} ${r.opportunity_name} ${r.stage_name}`.toLowerCase().includes(s)
  })

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Status Tracker
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{selected.lead_name || 'Unnamed Lead'}</h2>
            {selected.lead_status && <StatusBadge status={selected.lead_status} />}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Lead Name', selected.lead_name],
              ['Lead Status', selected.lead_status],
              ['Organization', selected.org_name],
              ['Geography', selected.geography],
              ['Vertical', selected.vertical],
              ['Estimated Value', selected.estimated_value != null ? `$${Number(selected.estimated_value).toLocaleString()}` : null],
              ['Opportunity', selected.opportunity_name],
              ['Stage', selected.stage_name],
              ['Expected Close', selected.expected_close_date ? new Date(selected.expected_close_date).toLocaleDateString() : null],
              ['Opportunity Value', selected.opportunity_value ? `$${Number(selected.opportunity_value).toLocaleString()}` : null],
              ['Closed Won', selected.is_closed_won ? 'Yes' : 'No'],
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referral Status Tracker</h1>
        <p className="text-sm text-gray-500">{filtered.length} referral{filtered.length !== 1 ? 's' : ''} in pipeline</p>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search referrals..." />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <DataTable columns={columns} data={filtered} onRowClick={(row) => setSelected(row)} />
    </div>
  )
}
