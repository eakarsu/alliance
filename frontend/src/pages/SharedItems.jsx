import { useState, useEffect } from 'react'
import { Share2, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatEntityType(t) {
  if (!t) return '-'
  return String(t).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const columns = [
  { key: 'entity_display_name', label: 'Name', render: (v, r) => v || r.entity_name || `${r.entity_type} #${r.entity_id}` },
  { key: 'entity_type', label: 'Type', render: (v) => v ? <StatusBadge status={formatEntityType(v)} /> : '-' },
  { key: 'access_level', label: 'Access', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'shared_by_name', label: 'Shared By', render: (v) => v || '-' },
  { key: 'shared_at', label: 'Shared Date', render: (v) => v ? formatDate(v) : '-' },
  { key: 'notes', label: 'Notes', render: (v) => v ? <span className="truncate max-w-[200px] block">{v}</span> : '-' },
]

export default function SharedItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchSharedItems()
  }, [])

  const fetchSharedItems = async () => {
    try {
      const res = await api.get('/shared-items')
      const data = res.data.data || res.data || []
      setItems(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load shared items')
    } finally {
      setLoading(false)
    }
  }

  const filtered = items.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.entity_display_name} ${r.entity_type} ${r.access_level} ${r.shared_by_name} ${r.notes}`.toLowerCase().includes(s)
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
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Shared Items
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Share2 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {selected.entity_display_name || selected.entity_name || `${selected.entity_type} #${selected.entity_id}`}
            </h2>
            <StatusBadge status={selected.access_level} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Entity Type', formatEntityType(selected.entity_type)],
              ['Entity ID', selected.entity_id],
              ['Access Level', selected.access_level],
              ['Shared By', selected.shared_by_name || selected.sharer_name],
              ['Shared At', selected.shared_at ? formatDate(selected.shared_at) : null],
              ['Expires At', selected.expires_at ? formatDate(selected.expires_at) : null],
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
        <div className="flex items-center gap-3">
          <Share2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Shared With Me</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">
            {items.length}
          </span>
        </div>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search shared items..." />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable columns={columns} data={filtered} onRowClick={(row) => setSelected(row)} />
    </div>
  )
}
