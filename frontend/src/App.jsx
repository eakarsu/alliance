import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { hasPageAccess } from './config/rolePermissions'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import Organizations from './pages/Organizations'
import Leads from './pages/Leads'
import Opportunities from './pages/Opportunities'
import Products from './pages/Products'
import Projects from './pages/Projects'
import Partners from './pages/Partners'
import Agreements from './pages/Agreements'
import Activities from './pages/Activities'
import Risks from './pages/Risks'
import Proposals from './pages/Proposals'
import KPI from './pages/KPI'
import AIAssistant from './pages/AIAssistant'
import ConflictQueue from './pages/ConflictQueue'
import VisibilityApprovals from './pages/VisibilityApprovals'
import MyReferrals from './pages/MyReferrals'
import StatusTracker from './pages/StatusTracker'
import PayoutSummary from './pages/PayoutSummary'
import SharedItems from './pages/SharedItems'
import ComplianceReviews from './pages/ComplianceReviews'
import DealPaths from './pages/DealPaths'
import DemoQueue from './pages/DemoQueue'
import IntegrationMap from './pages/IntegrationMap'
import AdvisoryRequests from './pages/AdvisoryRequests'
import MeetingNotes from './pages/MeetingNotes'
import ResourceView from './pages/ResourceView'
import GovernanceDashboard from './pages/GovernanceDashboard'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

function RoleRoute({ page, children }) {
  const { user } = useAuth()
  if (!user || !hasPageAccess(user.role, page)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        {/* CRM */}
        <Route path="/contacts" element={<RoleRoute page="contacts"><Contacts /></RoleRoute>} />
        <Route path="/organizations" element={<RoleRoute page="organizations"><Organizations /></RoleRoute>} />
        <Route path="/leads" element={<RoleRoute page="leads"><Leads /></RoleRoute>} />
        <Route path="/opportunities" element={<RoleRoute page="opportunities"><Opportunities /></RoleRoute>} />
        <Route path="/products" element={<RoleRoute page="products"><Products /></RoleRoute>} />
        {/* Delivery */}
        <Route path="/projects" element={<RoleRoute page="projects"><Projects /></RoleRoute>} />
        <Route path="/partners" element={<RoleRoute page="partners"><Partners /></RoleRoute>} />
        <Route path="/agreements" element={<RoleRoute page="agreements"><Agreements /></RoleRoute>} />
        <Route path="/proposals" element={<RoleRoute page="proposals"><Proposals /></RoleRoute>} />
        {/* Governance */}
        <Route path="/governance" element={<RoleRoute page="governance"><GovernanceDashboard /></RoleRoute>} />
        <Route path="/conflict-queue" element={<RoleRoute page="conflict-queue"><ConflictQueue /></RoleRoute>} />
        <Route path="/visibility-approvals" element={<RoleRoute page="visibility-approvals"><VisibilityApprovals /></RoleRoute>} />
        <Route path="/risks" element={<RoleRoute page="risks"><Risks /></RoleRoute>} />
        {/* Referrals & Revenue */}
        <Route path="/referrals" element={<RoleRoute page="referrals"><MyReferrals /></RoleRoute>} />
        <Route path="/status-tracker" element={<RoleRoute page="status-tracker"><StatusTracker /></RoleRoute>} />
        <Route path="/payout-summary" element={<RoleRoute page="payout-summary"><PayoutSummary /></RoleRoute>} />
        {/* Shared */}
        <Route path="/shared-items" element={<RoleRoute page="shared-items"><SharedItems /></RoleRoute>} />
        {/* New screens */}
        <Route path="/compliance-reviews" element={<RoleRoute page="compliance-reviews"><ComplianceReviews /></RoleRoute>} />
        <Route path="/deal-paths" element={<RoleRoute page="deal-paths"><DealPaths /></RoleRoute>} />
        <Route path="/demo-queue" element={<RoleRoute page="demo-queue"><DemoQueue /></RoleRoute>} />
        <Route path="/integration-map" element={<RoleRoute page="integration-map"><IntegrationMap /></RoleRoute>} />
        {/* Restricted / Advisor screens (Rol 6) */}
        <Route path="/advisory-requests" element={<RoleRoute page="advisory-requests"><AdvisoryRequests /></RoleRoute>} />
        <Route path="/meeting-notes" element={<RoleRoute page="meeting-notes"><MeetingNotes /></RoleRoute>} />
        {/* PMO Resource View (Rol 5) */}
        <Route path="/resource-view" element={<RoleRoute page="resource-view"><ResourceView /></RoleRoute>} />
        {/* Tools */}
        <Route path="/activities" element={<RoleRoute page="activities"><Activities /></RoleRoute>} />
        <Route path="/kpi" element={<RoleRoute page="kpi"><KPI /></RoleRoute>} />
        <Route path="/ai" element={<RoleRoute page="ai"><AIAssistant /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
