import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, Target, TrendingUp, Package,
  FolderKanban, Handshake, FileText, Activity, AlertTriangle,
  FileSpreadsheet, BarChart3, Bot, LogOut, Shield, Eye,
  GitPullRequest, MapPin, DollarSign, Share2, ShieldCheck,
  GitBranch, Monitor, Network, FileSearch, CalendarDays, UsersRound,
  Sparkles
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import { hasPageAccess, roleLabels } from '../config/rolePermissions'

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
    ]
  },
  {
    label: 'CRM',
    items: [
      { to: '/contacts', label: 'Contacts', icon: Users, page: 'contacts' },
      { to: '/organizations', label: 'Organizations', icon: Building2, page: 'organizations' },
      { to: '/leads', label: 'Leads', icon: Target, page: 'leads' },
      { to: '/opportunities', label: 'Opportunities', icon: TrendingUp, page: 'opportunities' },
      { to: '/products', label: 'Products', icon: Package, page: 'products' },
    ]
  },
  {
    label: 'Delivery',
    items: [
      { to: '/projects', label: 'Projects', icon: FolderKanban, page: 'projects' },
      { to: '/partners', label: 'Partners', icon: Handshake, page: 'partners' },
      { to: '/agreements', label: 'Agreements', icon: FileText, page: 'agreements' },
      { to: '/proposals', label: 'Proposals', icon: FileSpreadsheet, page: 'proposals' },
      { to: '/resource-view', label: 'Resource View', icon: UsersRound, page: 'resource-view' },
    ]
  },
  {
    label: 'Governance',
    items: [
      { to: '/governance', label: 'Governance Dashboard', icon: BarChart3, page: 'governance' },
      { to: '/conflict-queue', label: 'Conflict Queue', icon: Shield, page: 'conflict-queue' },
      { to: '/visibility-approvals', label: 'Visibility Approvals', icon: Eye, page: 'visibility-approvals' },
      { to: '/risks', label: 'Risks & Compliance', icon: AlertTriangle, page: 'risks' },
      { to: '/compliance-reviews', label: 'Compliance Reviews', icon: ShieldCheck, page: 'compliance-reviews' },
    ]
  },
  {
    label: 'Referrals & Revenue',
    items: [
      { to: '/referrals', label: 'My Referrals', icon: GitPullRequest, page: 'referrals' },
      { to: '/status-tracker', label: 'Status Tracker', icon: MapPin, page: 'status-tracker' },
      { to: '/payout-summary', label: 'Payout Summary', icon: DollarSign, page: 'payout-summary' },
    ]
  },
  {
    label: 'Ecosystem',
    items: [
      { to: '/deal-paths', label: 'Deal Paths', icon: GitBranch, page: 'deal-paths' },
      { to: '/integration-map', label: 'Integration Map', icon: Network, page: 'integration-map' },
      { to: '/demo-queue', label: 'Demo Queue', icon: Monitor, page: 'demo-queue' },
    ]
  },
  {
    label: 'Shared',
    items: [
      { to: '/shared-items', label: 'Shared With Me', icon: Share2, page: 'shared-items' },
      { to: '/advisory-requests', label: 'Advisory Requests', icon: FileSearch, page: 'advisory-requests' },
      { to: '/meeting-notes', label: 'Meeting Notes', icon: CalendarDays, page: 'meeting-notes' },
    ]
  },
  {
    label: 'Tools',
    items: [
      { to: '/activities', label: 'Activities', icon: Activity, page: 'activities' },
      { to: '/kpi', label: 'KPI Contributions', icon: BarChart3, page: 'kpi' },
      { to: '/ai', label: 'AI Assistant', icon: Bot, page: 'ai' },
      { to: '/ai-insights', label: 'AI Insights', icon: Sparkles, page: 'ai' },
    ]
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const userRole = user?.role || ''

  // Filter sections and items by role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPageAccess(userRole, item.page)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-slate-800 text-white">
      <div className="flex items-center gap-3 border-b border-slate-700 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 font-bold text-white text-sm">
          A
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight">Alliance CRM</h1>
          <p className="text-xs text-slate-400">Partner Management</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-bold">
            {user?.full_name?.[0] || user?.first_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.full_name || `${user?.first_name} ${user?.last_name}`}</p>
            <p className="truncate text-xs text-slate-400">{roleLabels[userRole] || userRole}</p>
          </div>
          <NotificationBell />
          <button
            onClick={logout}
            className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
