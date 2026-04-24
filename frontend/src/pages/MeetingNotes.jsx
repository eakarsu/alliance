import { useState, useEffect } from 'react'
import { CalendarDays, ArrowLeft } from 'lucide-react'
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
  { key: 'summary', label: 'Summary', render: (v) => v || '-' },
  { key: 'related_type', label: 'Related Type', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'activity_date', label: 'Date', render: (v) => v ? formatDate(v) : '-' },
  { key: 'owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'next_step', label: 'Next Step', render: (v) => v ? <span className="truncate max-w-[200px] block">{v}</span> : '-' },
]

export default function MeetingNotes() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await api.get('/activities')
      const items = res.data.data || res.data || []
      const arr = Array.isArray(items) ? items : []
      setData(arr.filter(item => item.activity_type === 'meeting'))
    } catch {
      setError('Failed to load meeting notes')
    } finally {
      setLoading(false)
    }
  }

  const filtered = data.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.summary} ${r.related_type} ${r.owner_name} ${r.next_step}`.toLowerCase().includes(s)
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
          <ArrowLeft className="h-4 w-4" /> Back to Meeting Notes
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <CalendarDays className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{selected.summary || 'Meeting'}</h2>
            <StatusBadge status="Meeting" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Summary', selected.summary],
              ['Related Type', selected.related_type],
              ['Related ID', selected.related_id],
              ['Date', selected.activity_date ? formatDate(selected.activity_date) : null],
              ['Owner', selected.owner_name],
              ['Next Step', selected.next_step],
              ['Private', selected.private_flag ? 'Yes' : 'No'],
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
              <p className="text-xs font-medium text-gray-500">Meeting Notes</p>
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
          <CalendarDays className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Meeting Notes</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">
            {data.length}
          </span>
        </div>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search meetings..." />
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
