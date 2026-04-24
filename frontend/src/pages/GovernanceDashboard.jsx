import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, AlertTriangle, BarChart3, ArrowRight, CheckCircle, XCircle } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'

const visibilityColumns = [
  { key: 'level', label: 'Visibility Level', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'count', label: 'Count', render: (v) => v || '0' },
]

const reviewColumns = [
  { key: 'reviewer_name', label: 'Reviewer', render: (v) => v || '-' },
  { key: 'action_result', label: 'Result', render: (v) => {
    if (!v) return '-'
    if (v === 'approved') return <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="h-3.5 w-3.5" /> Approved</span>
    if (v === 'rejected') return <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" /> Rejected</span>
    return <StatusBadge status={v} />
  }},
  { key: 'entity_type', label: 'Entity Type', render: (v) => v ? v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-' },
  { key: 'entity_id', label: 'Entity ID', render: (v) => v || '-' },
  { key: 'reviewed_at', label: 'Reviewed At', render: (v) => v ? new Date(v).toLocaleString() : '-' },
  { key: 'review_notes', label: 'Notes', render: (v) => v || '-' },
]

export default function GovernanceDashboard() {
  const [govData, setGovData] = useState(null)
  const [accessMode, setAccessMode] = useState('full')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [govRes, statsRes] = await Promise.allSettled([
        api.get('/governance/overview'),
        api.get('/dashboard/stats'),
      ])

      if (govRes.status === 'fulfilled') {
        setGovData(govRes.value.data.data || govRes.value.data || null)
        setAccessMode(govRes.value.data.access_mode || 'full')
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data || null)
      }
    } catch (err) {
      setError('Failed to load governance data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  const s = stats || {}
  const gov = govData || {}
  const roleData = s.role_data || {}
  const governance = roleData.governance || {}

  const activeConflicts = Number(governance.opp_conflicts || 0) + Number(governance.lead_conflicts || 0)
  const pendingVisibility = governance.pending_visibility || 0
  const totalPipeline = s.total_pipeline_value || 0

  // Visibility breakdown from governance overview
  const visibilityBreakdown = Array.isArray(gov.visibility_breakdown)
    ? gov.visibility_breakdown
    : [
        { level: 'public', count: gov.public_count || 0 },
        { level: 'internal', count: gov.internal_count || 0 },
        { level: 'restricted', count: gov.restricted_count || 0 },
        { level: 'confidential', count: gov.confidential_count || 0 },
      ].filter(v => v.count > 0 || true)

  const recentReviews = Array.isArray(gov.recent_reviews) ? gov.recent_reviews.slice(0, 10) : []

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Governance Dashboard</h1>
        <p className="text-sm text-gray-500">
          {accessMode === 'summary' ? 'Summary View - Conflict Overview' : 'Founding Orchestrator - Full Governance Overview'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          {error}
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => navigate('/conflict-queue')}
          className="cursor-pointer rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-5 text-white shadow-lg hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6" />
            <div>
              <p className="text-sm font-medium text-red-100">Active Conflicts</p>
              <p className="text-2xl font-bold">{activeConflicts}</p>
              <p className="text-xs text-red-200 mt-1">
                {governance.opp_conflicts || 0} opp + {governance.lead_conflicts || 0} lead
              </p>
            </div>
          </div>
        </div>

        <div
          onClick={() => navigate('/visibility-approvals')}
          className="cursor-pointer rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Eye className="h-6 w-6" />
            <div>
              <p className="text-sm font-medium text-amber-100">Pending Visibility Requests</p>
              <p className="text-2xl font-bold">{pendingVisibility}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            <div>
              <p className="text-sm font-medium text-blue-100">Total Pipeline Value</p>
              <p className="text-2xl font-bold">${Number(totalPipeline).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visibility Breakdown - hidden in summary mode */}
      {accessMode !== 'summary' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Visibility Breakdown</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {[
              { level: 'public', color: 'from-green-500 to-green-600', textColor: 'text-green-100' },
              { level: 'internal', color: 'from-blue-500 to-blue-600', textColor: 'text-blue-100' },
              { level: 'restricted', color: 'from-amber-500 to-amber-600', textColor: 'text-amber-100' },
              { level: 'confidential', color: 'from-red-500 to-red-600', textColor: 'text-red-100' },
            ].map((item) => {
              const found = visibilityBreakdown.find(v => v.level === item.level)
              const count = found ? found.count : 0
              return (
                <div key={item.level} className={`rounded-xl bg-gradient-to-br ${item.color} p-4 text-white shadow-lg`}>
                  <p className={`text-sm font-medium ${item.textColor} capitalize`}>{item.level}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Governance Actions - hidden in summary mode */}
      {accessMode !== 'summary' && recentReviews.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Governance Actions</h3>
          <DataTable columns={reviewColumns} data={recentReviews} />
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Links</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Conflict Queue', path: '/conflict-queue', icon: Shield, color: 'text-red-600 bg-red-50 hover:bg-red-100' },
            { label: 'Visibility Approvals', path: '/visibility-approvals', icon: Eye, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
            { label: 'Compliance Reviews', path: '/compliance-reviews', icon: AlertTriangle, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
            { label: 'Risks & Compliance', path: '/risks', icon: AlertTriangle, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-colors ${link.color} border`}
            >
              <div className="flex items-center gap-2">
                <link.icon className="h-4 w-4" />
                {link.label}
              </div>
              <ArrowRight className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
