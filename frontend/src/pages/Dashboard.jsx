import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Building2, Target, TrendingUp, FolderKanban, Package,
  Handshake, AlertTriangle, Activity, DollarSign, FileText, BarChart3,
  Shield, Eye, GitPullRequest, Clock
} from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { hasPageAccess, roleLabels, getAccessDepth } from '../config/rolePermissions'
import KPICard from '../components/KPICard'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'

const activityColumns = [
  { key: 'activity_type', label: 'Type', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'summary', label: 'Summary', render: (v) => v || '-' },
  { key: 'owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'related_type', label: 'Related To', render: (v) => v || '-' },
  { key: 'activity_date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

const riskColumns = [
  { key: 'risk_type', label: 'Type', render: (v) => v || '-' },
  { key: 'severity', label: 'Severity', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'mitigation_notes', label: 'Mitigation', render: (v) => v || '-' },
  { key: 'owner_name', label: 'Owner', render: (v) => v || '-' },
  { key: 'related_type', label: 'Related To', render: (v) => v || '-' },
]

const leadColumns = [
  { key: 'lead_name', label: 'Lead', render: (v) => v || '-' },
  { key: 'org_name', label: 'Organization', render: (v) => v || '-' },
  { key: 'geography', label: 'Geography', render: (v) => v || '-' },
  { key: 'estimated_value', label: 'Value', render: (v) => v ? `$${Number(v).toLocaleString()}` : '-' },
  { key: 'confidence_score', label: 'Confidence', render: (v) => v != null ? `${v}%` : '-' },
  { key: 'status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'source_owner_name', label: 'Owner', render: (v) => v || '-' },
]

const stageColumns = [
  { key: 'stage_name', label: 'Stage', render: (v) => v || '-' },
  { key: 'count', label: 'Deals', render: (v) => v || '0' },
  { key: 'value', label: 'Value', render: (v) => v ? `$${Number(v).toLocaleString()}` : '$0' },
]

const oppRoleColumns = [
  { key: 'opportunity_name', label: 'Opportunity', render: (v) => v || '-' },
  { key: 'role_in_opportunity', label: 'Role', render: (v) => v ? v.replace(/_/g, ' ') : '-' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [govOverview, setGovOverview] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role || ''

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats')
      setStats(res.data)
      if (role === 'founding_orchestrator') {
        try {
          const govRes = await api.get('/governance/overview')
          setGovOverview(govRes.data.data || null)
        } catch {
          // Governance overview not available
        }
      }
    } catch (err) {
      setError('Failed to load dashboard stats')
      setStats({})
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
  const counts = s.counts || {}
  const roleData = s.role_data || {}

  const allKpiCards = [
    { icon: Users, title: 'Contacts', value: counts.contacts_count || '0', gradient: 'from-blue-500 to-blue-600', path: '/contacts', page: 'contacts' },
    { icon: Building2, title: 'Organizations', value: counts.organizations_count || '0', gradient: 'from-indigo-500 to-indigo-600', path: '/organizations', page: 'organizations' },
    { icon: Target, title: 'Leads', value: counts.leads_count || '0', gradient: 'from-green-500 to-green-600', path: '/leads', page: 'leads' },
    { icon: TrendingUp, title: 'Opportunities', value: counts.opportunities_count || '0', gradient: 'from-purple-500 to-purple-600', path: '/opportunities', page: 'opportunities' },
    { icon: Package, title: 'Products', value: counts.products_count || '0', gradient: 'from-cyan-500 to-cyan-600', path: '/products', page: 'products' },
    { icon: FolderKanban, title: 'Projects', value: counts.projects_count || '0', gradient: 'from-amber-500 to-amber-600', path: '/projects', page: 'projects' },
    { icon: Handshake, title: 'Partners', value: counts.partners_count || '0', gradient: 'from-emerald-500 to-emerald-600', path: '/partners', page: 'partners' },
    { icon: AlertTriangle, title: 'Risks', value: counts.risks_count || '0', gradient: 'from-red-500 to-red-600', path: '/risks', page: 'risks' },
    { icon: FileText, title: 'Agreements', value: counts.agreements_count || '0', gradient: 'from-teal-500 to-teal-600', path: '/agreements', page: 'agreements' },
    { icon: DollarSign, title: 'Pipeline Value', value: s.total_pipeline_value ? `$${Number(s.total_pipeline_value).toLocaleString()}` : '$0', gradient: 'from-yellow-500 to-orange-500', path: '/opportunities', page: 'opportunities' },
  ]

  const kpiCards = allKpiCards.filter(card => hasPageAccess(role, card.page))

  const recentActivities = Array.isArray(s.recent_activities) ? s.recent_activities : []
  const openRisks = Array.isArray(s.open_risks) ? s.open_risks : []
  const recentLeads = Array.isArray(s.recent_leads) ? s.recent_leads : []
  const oppsByStage = Array.isArray(s.opportunities_by_stage) ? s.opportunities_by_stage.filter(o => Number(o.count) > 0) : []
  const myOppRoles = Array.isArray(roleData.my_opportunity_roles) ? roleData.my_opportunity_roles : []

  const dashboardTitle = {
    founding_orchestrator: 'Governance Dashboard',
    pmo_coordinator: 'Delivery Dashboard',
    solution_architect: 'Technical Dashboard',
    enterprise_partner: 'My Dashboard',
    product_experience_lead: 'My Dashboard',
    product_partner: 'My Dashboard',
    us_market_bridge: 'My Dashboard',
    restricted_external: 'Shared Dashboard',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{dashboardTitle[role] || 'Dashboard'}</h1>
        <p className="text-sm text-gray-500">{roleLabels[role] || role} - {getAccessDepth(role, 'dashboard') === 'tam' ? 'Full Access' : 'Filtered View'}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          {error}
        </div>
      )}

      {/* Governance-specific alerts */}
      {role === 'founding_orchestrator' && roleData.governance && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div onClick={() => navigate('/conflict-queue')} className="cursor-pointer rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-5 text-white shadow-lg hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              <div>
                <p className="text-sm font-medium text-red-100">Active Conflicts</p>
                <p className="text-2xl font-bold">{Number(roleData.governance.opp_conflicts || 0) + Number(roleData.governance.lead_conflicts || 0)}</p>
              </div>
            </div>
          </div>
          <div onClick={() => navigate('/visibility-approvals')} className="cursor-pointer rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6" />
              <div>
                <p className="text-sm font-medium text-amber-100">Pending Visibility</p>
                <p className="text-2xl font-bold">{roleData.governance.pending_visibility || 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6" />
              <div>
                <p className="text-sm font-medium text-blue-100">Total Pipeline</p>
                <p className="text-2xl font-bold">${Number(s.total_pipeline_value || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Governance Overview - Visibility Breakdown & Recent Actions */}
      {role === 'founding_orchestrator' && govOverview && (
        <div className="space-y-4">
          {Array.isArray(govOverview.visibility_breakdown) && govOverview.visibility_breakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Visibility Breakdown</h3>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {govOverview.visibility_breakdown.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{row.visibility_level || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{row.count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {Array.isArray(govOverview.recent_actions) && govOverview.recent_actions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Governance Actions</h3>
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {govOverview.recent_actions.slice(0, 10).map((action, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{action.reviewer || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{action.action || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{action.entity || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{action.created_at ? new Date(action.created_at).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PMO / Solution Architect - Conflict Queue Summary */}
      {(role === 'pmo_coordinator' || role === 'solution_architect') && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div onClick={() => navigate('/conflict-queue')} className="cursor-pointer rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              <div>
                <p className="text-sm font-medium text-amber-100">Conflict Queue Summary</p>
                <p className="text-2xl font-bold">{roleData.governance?.opp_conflicts != null ? (Number(roleData.governance.opp_conflicts || 0) + Number(roleData.governance.lead_conflicts || 0)) : roleData.conflict_count || 0}</p>
                <p className="text-xs text-amber-200 mt-1">View Conflict Queue</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical-specific alerts */}
      {role === 'solution_architect' && roleData.technical && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-blue-100">Needs Technical Review</p>
            <p className="text-2xl font-bold mt-1">{roleData.technical.needs_review || 0}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-red-100">Technical Risks</p>
            <p className="text-2xl font-bold mt-1">{roleData.technical.tech_risks || 0}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-green-100">My Pipeline Value</p>
            <p className="text-2xl font-bold mt-1">${Number(s.total_pipeline_value || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* PMO-specific alerts */}
      {role === 'pmo_coordinator' && roleData.pmo && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-blue-100">Active Projects</p>
            <p className="text-2xl font-bold mt-1">{roleData.pmo.active_projects || 0}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-amber-100">Overdue Milestones</p>
            <p className="text-2xl font-bold mt-1">{roleData.pmo.overdue_milestones || 0}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-red-100">Project Risks</p>
            <p className="text-2xl font-bold mt-1">{roleData.pmo.project_risks || 0}</p>
          </div>
        </div>
      )}

      {/* Partner-specific alerts */}
      {roleData.partner && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div onClick={() => navigate('/payout-summary')} className="cursor-pointer rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-5 text-white shadow-lg hover:scale-[1.02] transition-transform">
            <div className="flex items-center gap-3">
              <DollarSign className="h-6 w-6" />
              <div>
                <p className="text-sm font-medium text-green-100">Total Revenue Share</p>
                <p className="text-2xl font-bold">${Number(roleData.partner.total_payout || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-amber-100">Pending Payouts</p>
            <p className="text-2xl font-bold mt-1">{roleData.partner.pending_payouts || 0}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 text-white shadow-lg">
            <p className="text-sm font-medium text-purple-100">My Pipeline</p>
            <p className="text-2xl font-bold mt-1">${Number(s.total_pipeline_value || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpiCards.map((card) => (
          <KPICard
            key={card.title}
            icon={card.icon}
            title={card.title}
            value={card.value}
            gradient={card.gradient}
            onClick={() => navigate(card.path)}
          />
        ))}
      </div>

      {/* My Opportunity Roles - Table */}
      {myOppRoles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">My Opportunity Roles</h3>
            <button onClick={() => navigate('/opportunities')} className="text-xs text-blue-500 hover:text-blue-700 font-medium">View All</button>
          </div>
          <DataTable
            columns={oppRoleColumns}
            data={myOppRoles}
            onRowClick={() => navigate('/opportunities')}
          />
        </div>
      )}

      {/* Pipeline by Stage - Table */}
      {oppsByStage.length > 0 && hasPageAccess(role, 'opportunities') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Pipeline by Stage</h3>
            <button onClick={() => navigate('/opportunities')} className="text-xs text-blue-500 hover:text-blue-700 font-medium">View All</button>
          </div>
          <DataTable
            columns={stageColumns}
            data={oppsByStage}
            onRowClick={() => navigate('/opportunities')}
          />
        </div>
      )}

      {/* Recent Activities - Table */}
      {hasPageAccess(role, 'activities') && recentActivities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
            <button onClick={() => navigate('/activities')} className="text-xs text-blue-500 hover:text-blue-700 font-medium">View All</button>
          </div>
          <DataTable
            columns={activityColumns}
            data={recentActivities}
            onRowClick={() => navigate('/activities')}
          />
        </div>
      )}

      {/* Open Risks - Table */}
      {hasPageAccess(role, 'risks') && openRisks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Open Risks</h3>
            <button onClick={() => navigate('/risks')} className="text-xs text-blue-500 hover:text-blue-700 font-medium">View All</button>
          </div>
          <DataTable
            columns={riskColumns}
            data={openRisks}
            onRowClick={() => navigate('/risks')}
          />
        </div>
      )}

      {/* Recent Leads - Table */}
      {hasPageAccess(role, 'leads') && recentLeads.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Recent Leads</h3>
            <button onClick={() => navigate('/leads')} className="text-xs text-blue-500 hover:text-blue-700 font-medium">View All</button>
          </div>
          <DataTable
            columns={leadColumns}
            data={recentLeads}
            onRowClick={() => navigate('/leads')}
          />
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-lg">
          <p className="text-sm font-medium text-blue-100">Total Pipeline</p>
          <p className="text-2xl font-bold mt-1">${Number(s.total_pipeline_value || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-5 text-white shadow-lg">
          <p className="text-sm font-medium text-green-100">Won Value</p>
          <p className="text-2xl font-bold mt-1">${Number(s.total_won_value || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-5 text-white shadow-lg">
          <p className="text-sm font-medium text-red-100">Open Risks</p>
          <p className="text-2xl font-bold mt-1">{openRisks.length}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 text-white shadow-lg">
          <p className="text-sm font-medium text-purple-100">Active Users</p>
          <p className="text-2xl font-bold mt-1">{counts.users_count || '0'}</p>
        </div>
      </div>
    </div>
  )
}
