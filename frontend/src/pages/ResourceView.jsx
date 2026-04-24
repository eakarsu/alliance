import { useState, useEffect } from 'react'
import { Users, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const columns = [
  { key: 'project_name', label: 'Project Name', render: (v) => v || '-' },
  { key: 'project_owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'delivery_manager_name', label: 'Delivery Manager', render: (v) => v || '-' },
  { key: 'technical_lead_name', label: 'Technical Lead', render: (v) => v || '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'start_date', label: 'Start Date', render: (v) => v ? formatDate(v) : '-' },
  { key: 'target_end_date', label: 'End Date', render: (v) => v ? formatDate(v) : '-' },
]

export default function ResourceView() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [milestonesLoading, setMilestonesLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await api.get('/projects')
      const items = res.data.data || res.data || []
      setData(Array.isArray(items) ? items : [])
    } catch {
      setError('Failed to load resource data')
    } finally {
      setLoading(false)
    }
  }

  const fetchMilestones = async (projectId) => {
    setMilestonesLoading(true)
    setMilestones([])
    try {
      const res = await api.get(`/projects/${projectId}`)
      const project = res.data.data || res.data || {}
      const ms = project.milestones || []
      setMilestones(Array.isArray(ms) ? ms : [])
    } catch {
      setMilestones([])
    } finally {
      setMilestonesLoading(false)
    }
  }

  const handleRowClick = (row) => {
    setSelected(row)
    fetchMilestones(row.id)
  }

  const filtered = data.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.project_name} ${r.project_owner_name} ${r.delivery_manager_name} ${r.technical_lead_name} ${r.status}`.toLowerCase().includes(s)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (selected) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => { setSelected(null); setMilestones([]) }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Resource View
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{selected.project_name}</h2>
            {selected.status && <StatusBadge status={selected.status} />}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Project Name', selected.project_name],
              ['Opportunity', selected.opportunity_name],
              ['Project Owner', selected.project_owner_name],
              ['Delivery Manager', selected.delivery_manager_name],
              ['Technical Lead', selected.technical_lead_name],
              ['Status', selected.status],
              ['Start Date', selected.start_date ? formatDate(selected.start_date) : null],
              ['Target End Date', selected.target_end_date ? formatDate(selected.target_end_date) : null],
              ['Support End Date', selected.support_end_date ? formatDate(selected.support_end_date) : null],
              ['Budget', selected.budget ? `$${Number(selected.budget).toLocaleString()}` : null],
              ['Scope Version', selected.scope_version],
              ['Created', selected.created_at ? formatDate(selected.created_at) : null],
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

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Milestones</h3>
          {milestonesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : milestones.length > 0 ? (
            <div className="space-y-3">
              {milestones.map((ms, idx) => (
                <div key={ms.id || idx} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{ms.milestone_name || ms.name || `Milestone ${idx + 1}`}</p>
                    {ms.status && <StatusBadge status={ms.status} />}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    {ms.due_date && <span>Due: {formatDate(ms.due_date)}</span>}
                    {ms.completed_date && <span>Completed: {formatDate(ms.completed_date)}</span>}
                    {ms.description && <span className="col-span-2 text-gray-600">{ms.description}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4">No milestones found for this project.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Resource View</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">
            {data.length}
          </span>
        </div>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search resources..." />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable columns={columns} data={filtered} onRowClick={handleRowClick} />
    </div>
  )
}
