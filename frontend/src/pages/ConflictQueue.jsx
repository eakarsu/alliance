import { useState, useEffect } from 'react'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

const columns = [
  { key: 'name', label: 'Name', render: (v) => v || 'Unnamed' },
  { key: 'entity_type', label: 'Type', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'account_name', label: 'Account', render: (v) => v || '-' },
  { key: 'source_owner_name', label: 'Source Owner', render: (v) => v || '-' },
  { key: 'deal_owner_name', label: 'Deal Owner', render: (v) => v || '-' },
  { key: 'visibility_level', label: 'Visibility', render: (v) => v || '-' },
  { key: 'updated_at', label: 'Updated', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

export default function ConflictQueue() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [resolvingId, setResolvingId] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [accessMode, setAccessMode] = useState('full')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/governance/conflict-queue')
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
      setTotal(res.data.total || items.length || 0)
      if (res.data.access_mode) setAccessMode(res.data.access_mode)
    } catch { setError('Failed to load conflict queue') } finally { setLoading(false) }
  }

  const handleResolveSubmit = async (type, id) => {
    if (!resolutionNotes.trim()) return
    setSaving(true)
    try {
      await api.put(`/governance/conflict-queue/${type}/${id}/resolve`, { resolution_notes: resolutionNotes })
      setData(prev => prev.filter(item => !(item.entity_type === type && item.id === id)))
      setTotal(prev => prev - 1)
      setResolvingId(null)
      setResolutionNotes('')
      setSelected(null)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve conflict')
    } finally { setSaving(false) }
  }

  const filtered = data.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.name} ${r.entity_type} ${r.account_name} ${r.source_owner_name} ${r.visibility_level}`.toLowerCase().includes(s)
  })

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected) {
    const isResolving = resolvingId === selected.id
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => { setSelected(null); setResolvingId(null); setResolutionNotes('') }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Conflict Queue
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-900">{selected.name || 'Unnamed'}</h2>
              <StatusBadge status={selected.entity_type} />
            </div>
            {accessMode !== 'summary' && (
              <button
                onClick={() => { isResolving ? setResolvingId(null) : setResolvingId(selected.id); setResolutionNotes('') }}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${isResolving ? 'bg-gray-200 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {isResolving ? 'Cancel' : 'Resolve Conflict'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Entity Type', selected.entity_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
              ['Entity ID', selected.id],
              ['Account', selected.account_name],
              ['Source Owner', selected.source_owner_name],
              ['Deal Owner', selected.deal_owner_name],
              ['Sponsor', selected.sponsor_name],
              ...(accessMode !== 'summary' ? [['Visibility Level', selected.visibility_level]] : []),
              ['Conflict Flag', selected.conflict_flag ? 'Yes' : 'No'],
              ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
              ['Last Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{l}</p>
                <p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p>
              </div>
            ))}
          </div>

          {accessMode !== 'summary' && selected.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selected.notes}</p>
            </div>
          )}

          {isResolving && (
            <div className="mt-6 border-t border-gray-200 pt-4 space-y-3">
              <label className="block text-sm font-medium text-gray-700">Resolution Notes *</label>
              <textarea
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                rows={3}
                placeholder="Describe how this conflict was resolved..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => handleResolveSubmit(selected.entity_type, selected.id)}
                  disabled={saving || !resolutionNotes.trim()}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Resolving...' : 'Submit Resolution'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Conflict Queue</h1>
        <p className="text-sm text-gray-500">{total} conflict{total !== 1 ? 's' : ''} pending resolution</p>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search conflicts..." />
      </div>

      {accessMode === 'summary' && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          Summary View - You have read-only access to the conflict queue
        </div>
      )}

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <DataTable columns={accessMode === 'summary' ? columns.filter(c => c.key !== 'visibility_level') : columns} data={filtered} onRowClick={(row) => setSelected(row)} />
    </div>
  )
}
