import { useState, useEffect } from 'react'
import { ShieldCheck, ArrowRight, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

const columns = [
  { key: 'entity_type', label: 'Entity Type', render: (v) => v ? v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-' },
  { key: 'entity_id', label: 'Entity ID', render: (v) => v || '-' },
  { key: 'requester_name', label: 'Requester', render: (v) => v || '-' },
  { key: 'current_visibility', label: 'Current', render: (v) => v || '-' },
  { key: 'requested_visibility', label: 'Requested', render: (v) => v || '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'created_at', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

export default function VisibilityApprovals() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [actionType, setActionType] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.get('/governance/visibility-requests', { params: { status: 'pending' } })
      const items = res.data.data || []
      setData(Array.isArray(items) ? items : [])
    } catch { setError('Failed to load visibility requests') } finally { setLoading(false) }
  }

  const handleSubmitReview = async (id, type) => {
    setSaving(true)
    setSuccessMsg('')
    try {
      await api.put(`/governance/visibility-requests/${id}/review`, {
        status: type,
        review_notes: reviewNotes,
      })
      setData(prev => prev.filter(item => item.id !== id))
      setSelected(null)
      setActionType(null)
      setReviewNotes('')
      setSuccessMsg(`Request ${type} successfully.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review')
    } finally { setSaving(false) }
  }

  const filtered = data.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.entity_type} ${r.requester_name} ${r.current_visibility} ${r.requested_visibility} ${r.status}`.toLowerCase().includes(s)
  })

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => { setSelected(null); setActionType(null); setReviewNotes('') }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Visibility Approvals
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">
              {selected.entity_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} #{selected.entity_id}
            </h2>
            <StatusBadge status={selected.status} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Entity Type', selected.entity_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
              ['Entity ID', selected.entity_id],
              ['Requester', selected.requester_name],
              ['Status', selected.status],
              ['Current Visibility', selected.current_visibility],
              ['Requested Visibility', selected.requested_visibility],
              ['Requested Date', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{l}</p>
                <p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 py-4">
            <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
              {selected.current_visibility || 'unknown'}
            </span>
            <ArrowRight className="h-5 w-5 text-blue-500" />
            <span className="rounded-lg bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
              {selected.requested_visibility || 'unknown'}
            </span>
          </div>

          {selected.reason && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Reason</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selected.reason}</p>
            </div>
          )}

          <div className="mt-6 border-t border-gray-200 pt-4 space-y-4">
            <div className="flex gap-3">
              <button
                onClick={() => setActionType(actionType === 'approved' ? null : 'approved')}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${actionType === 'approved' ? 'bg-green-200 text-green-800 ring-2 ring-green-400' : 'bg-green-600 text-white hover:bg-green-700'}`}
              >
                <CheckCircle className="h-4 w-4" /> Approve
              </button>
              <button
                onClick={() => setActionType(actionType === 'rejected' ? null : 'rejected')}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium ${actionType === 'rejected' ? 'bg-red-200 text-red-800 ring-2 ring-red-400' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>

            {actionType && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {actionType === 'approved' ? 'Approval' : 'Rejection'} Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder={`Add notes for ${actionType === 'approved' ? 'approval' : 'rejection'}...`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSubmitReview(selected.id, actionType)}
                    disabled={saving}
                    className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${actionType === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {saving ? 'Submitting...' : `Confirm ${actionType === 'approved' ? 'Approval' : 'Rejection'}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visibility Approvals</h1>
        <p className="text-sm text-gray-500">{data.length} pending request{data.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search requests..." />
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
      {successMsg && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-600">{successMsg}</div>}

      <DataTable columns={columns} data={filtered} onRowClick={(row) => setSelected(row)} />
    </div>
  )
}
