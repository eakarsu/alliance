import { useState, useEffect } from 'react'
import { GitBranch, ArrowLeft, DollarSign } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

const pathColumns = [
  { key: 'path_name', label: 'Path Name', render: (v) => v ? String(v).replace(/\b\w/g, c => c.toUpperCase()) : '-' },
  { key: 'description', label: 'Description', render: (v) => v || '-' },
]

const oppColumns = [
  { key: 'opportunity_name', label: 'Opportunity', render: (v) => v || '-' },
  { key: 'account_name', label: 'Account', render: (v) => v || '-' },
  { key: 'deal_owner_name', label: 'Deal Owner', render: (v) => v || '-' },
  { key: 'estimated_total_value', label: 'Value', render: (v) => v ? `$${Number(v).toLocaleString()}` : '-' },
  { key: 'stage_name', label: 'Stage', render: (v) => v ? <StatusBadge status={v} /> : '-' },
]

export default function DealPaths() {
  const [paths, setPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPath, setSelectedPath] = useState(null)
  const [opportunities, setOpportunities] = useState([])
  const [oppsLoading, setOppsLoading] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState(null)

  useEffect(() => { fetchPaths() }, [])

  const fetchPaths = async () => {
    try {
      const res = await api.get('/deal-paths')
      setPaths(res.data.data || [])
    } catch { setError('Failed to load deal paths') } finally { setLoading(false) }
  }

  const handlePathClick = async (path) => {
    setSelectedPath(path)
    setSelectedOpp(null)
    setOppsLoading(true)
    try {
      const res = await api.get(`/deal-paths/${path.id}/opportunities`)
      setOpportunities(res.data.data || [])
    } catch { setOpportunities([]) } finally { setOppsLoading(false) }
  }

  const handleOppClick = async (opp) => {
    try {
      const res = await api.get(`/opportunities/${opp.id}`)
      setSelectedOpp(res.data)
    } catch {
      setSelectedOpp(opp)
    }
  }

  const filtered = paths.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.path_name} ${r.description}`.toLowerCase().includes(s)
  })

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  // Opportunity detail view
  if (selectedOpp) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelectedOpp(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to {selectedPath?.path_name || 'Deal Path'}
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{selectedOpp.opportunity_name}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Account', selectedOpp.account_name],
              ['Deal Owner', selectedOpp.deal_owner_name],
              ['Source Owner', selectedOpp.source_owner_name],
              ['Sponsor', selectedOpp.sponsor_name],
              ['Stage', selectedOpp.stage_name],
              ['Pipeline', selectedOpp.pipeline_name],
              ['Deal Type', selectedOpp.deal_type],
              ['Estimated Value', selectedOpp.estimated_total_value ? `$${Number(selectedOpp.estimated_total_value).toLocaleString()}` : null],
              ['Recurring Value', selectedOpp.recurring_value ? `$${Number(selectedOpp.recurring_value).toLocaleString()}` : null],
              ['One-Time Value', selectedOpp.one_time_value ? `$${Number(selectedOpp.one_time_value).toLocaleString()}` : null],
              ['Expected Close', selectedOpp.expected_close_date ? new Date(selectedOpp.expected_close_date).toLocaleDateString() : null],
              ['Win Probability', selectedOpp.win_probability != null ? `${selectedOpp.win_probability}%` : null],
              ['Visibility', selectedOpp.visibility_level],
              ['Compliance Status', selectedOpp.compliance_review_status],
              ['Created', selectedOpp.created_at ? new Date(selectedOpp.created_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{l}</p>
                <p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p>
              </div>
            ))}
          </div>
          {selectedOpp.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedOpp.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Deal path detail with opportunities table
  if (selectedPath) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => { setSelectedPath(null); setOpportunities([]) }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Deal Paths
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <GitBranch className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900 capitalize">{selectedPath.path_name}</h2>
          </div>
          {selectedPath.description && (
            <p className="text-sm text-gray-600 mb-4">{selectedPath.description}</p>
          )}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Opportunities ({opportunities.length})</h3>
            {oppsLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              <DataTable columns={oppColumns} data={opportunities} onRowClick={(row) => handleOppClick(row)} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <GitBranch className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Deal Paths</h1>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">{paths.length}</span>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search deal paths..." />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <DataTable columns={pathColumns} data={filtered} onRowClick={(row) => handlePathClick(row)} />
    </div>
  )
}
