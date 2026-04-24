import { useState, useEffect } from 'react'
import { FileSearch, ArrowLeft } from 'lucide-react'
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
  { key: 'entity_type', label: 'Entity Type', render: (v) => v ? <StatusBadge status={formatEntityType(v)} /> : '-' },
  { key: 'entity_display_name', label: 'Entity Name', render: (v, r) => v || r.entity_name || `${r.entity_type} #${r.entity_id}` },
  { key: 'access_level', label: 'Access Level', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'shared_by_name', label: 'Shared By', render: (v) => v || '-' },
  { key: 'shared_at', label: 'Shared Date', render: (v) => v ? formatDate(v) : '-' },
  { key: 'review_status', label: 'Review Status', render: (v) => v ? <StatusBadge status={v} /> : <StatusBadge status="Pending" /> },
]

export default function AdvisoryRequests() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [advisoryNotes, setAdvisoryNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await api.get('/shared-items')
      const data = res.data.data || res.data || []
      const arr = Array.isArray(data) ? data : []
      setItems(arr.map(item => ({
        ...item,
        review_status: item.review_status || (item.notes ? 'Reviewed' : 'Pending'),
      })))
    } catch {
      setError('Failed to load advisory requests')
    } finally {
      setLoading(false)
    }
  }

  const filtered = items.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.entity_display_name} ${r.entity_type} ${r.access_level} ${r.shared_by_name} ${r.review_status}`.toLowerCase().includes(s)
  })

  const handleSubmitNotes = async () => {
    if (!advisoryNotes.trim()) return
    setSubmitting(true)
    setSubmitSuccess(false)
    try {
      await api.put(`/shared-items/${selected.id}`, { notes: advisoryNotes })
      setSubmitSuccess(true)
      setSelected({ ...selected, notes: advisoryNotes, review_status: 'Reviewed' })
      setItems(prev => prev.map(item => item.id === selected.id ? { ...item, notes: advisoryNotes, review_status: 'Reviewed' } : item))
    } catch {
      alert('Failed to submit advisory notes')
    } finally {
      setSubmitting(false)
    }
  }

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
        <button onClick={() => { setSelected(null); setAdvisoryNotes(''); setSubmitSuccess(false) }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Advisory Requests
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <FileSearch className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {selected.entity_display_name || selected.entity_name || `${selected.entity_type} #${selected.entity_id}`}
            </h2>
            <StatusBadge status={selected.review_status || 'Pending'} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Entity Type', formatEntityType(selected.entity_type)],
              ['Entity ID', selected.entity_id],
              ['Access Level', selected.access_level],
              ['Shared By', selected.shared_by_name || selected.sharer_name],
              ['Shared Date', selected.shared_at ? formatDate(selected.shared_at) : null],
              ['Expires At', selected.expires_at ? formatDate(selected.expires_at) : null],
              ['Review Status', selected.review_status || 'Pending'],
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
              <p className="text-xs font-medium text-gray-500">Existing Notes</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selected.notes}</p>
            </div>
          )}
          <div className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-gray-700">Advisory Notes</label>
            <textarea
              value={advisoryNotes}
              onChange={e => setAdvisoryNotes(e.target.value)}
              rows={4}
              placeholder="Enter your advisory review notes here..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmitNotes}
                disabled={submitting || !advisoryNotes.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Advisory Notes'}
              </button>
              {submitSuccess && <span className="text-sm text-green-600 font-medium">Notes submitted successfully</span>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileSearch className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Advisory Requests</h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-700">
            {items.length}
          </span>
        </div>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search advisory requests..." />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable columns={columns} data={filtered} onRowClick={(row) => { setSelected(row); setAdvisoryNotes(row.notes || ''); setSubmitSuccess(false) }} />
    </div>
  )
}
