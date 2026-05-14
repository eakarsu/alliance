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
import AIInsights from './pages/AIInsights'
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

// // === Batch 09 Gaps & Frontend Mounts ===
const PredictiveDealClosureWithProbabilityModelingCfs = React.lazy(() => import('./pages/Batch09/PredictiveDealClosureWithProbabilityModelingCfs'));
const PartnerRiskAssessmentFromFinancialPerformanceDataCfs = React.lazy(() => import('./pages/Batch09/PartnerRiskAssessmentFromFinancialPerformanceDataCfs'));
const ConflictDetectionInPartnerNetworksCfs = React.lazy(() => import('./pages/Batch09/ConflictDetectionInPartnerNetworksCfs'));
const AutomatedPayoutCalculationsAndReconciliationCfs = React.lazy(() => import('./pages/Batch09/AutomatedPayoutCalculationsAndReconciliationCfs'));
const GovernanceComplianceAutomationAuditApprovalsCfs = React.lazy(() => import('./pages/Batch09/GovernanceComplianceAutomationAuditApprovalsCfs'));
const FinancialSystemIntegrationForRevenueTrackingCfs = React.lazy(() => import('./pages/Batch09/FinancialSystemIntegrationForRevenueTrackingCfs'));
const StrategicPartnerRecommendationEngineCfs = React.lazy(() => import('./pages/Batch09/StrategicPartnerRecommendationEngineCfs'));
const LegalclmSystemIntegrationCfs = React.lazy(() => import('./pages/Batch09/LegalclmSystemIntegrationCfs'));
const AiOpportunityScoringAndStagePredictionGapAi = React.lazy(() => import('./pages/Batch09/AiOpportunityScoringAndStagePredictionGapAi'));
const PartnerPerformancePredictionGapAi = React.lazy(() => import('./pages/Batch09/PartnerPerformancePredictionGapAi'));
const DealStageForecastingGapAi = React.lazy(() => import('./pages/Batch09/DealStageForecastingGapAi'));
const ConflictResolutionRecommendationGapAi = React.lazy(() => import('./pages/Batch09/ConflictResolutionRecommendationGapAi'));
const GovernanceComplianceAutoChecksGapAi = React.lazy(() => import('./pages/Batch09/GovernanceComplianceAutoChecksGapAi'));
const PayoutrevenueShareManagementGapNon = React.lazy(() => import('./pages/Batch09/PayoutrevenueShareManagementGapNon'));
const FinancialReportingAndReconciliationGapNon = React.lazy(() => import('./pages/Batch09/FinancialReportingAndReconciliationGapNon'));
const ContractLifecycleManagementModuleGapNon = React.lazy(() => import('./pages/Batch09/ContractLifecycleManagementModuleGapNon'));
const NegotiationPlaybookTemplateLibraryGapNon = React.lazy(() => import('./pages/Batch09/NegotiationPlaybookTemplateLibraryGapNon'));
const MobilePartnerPortalUiGapNon = React.lazy(() => import('./pages/Batch09/MobilePartnerPortalUiGapNon'));
const ESignatureIntegrationGapNon = React.lazy(() => import('./pages/Batch09/ESignatureIntegrationGapNon'));

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
        <Route path="/ai-insights" element={<RoleRoute page="ai"><AIInsights /></RoleRoute>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    
      {/* // === Batch 09 Gaps & Frontend Mounts === */}
        <Route path="/batch09/cfs/predictive-deal-closure-with-probability-modeling" element={<React.Suspense fallback={<div>Loading...</div>}><PredictiveDealClosureWithProbabilityModelingCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/partner-risk-assessment-from-financial-performance-data" element={<React.Suspense fallback={<div>Loading...</div>}><PartnerRiskAssessmentFromFinancialPerformanceDataCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/conflict-detection-in-partner-networks" element={<React.Suspense fallback={<div>Loading...</div>}><ConflictDetectionInPartnerNetworksCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/automated-payout-calculations-and-reconciliation" element={<React.Suspense fallback={<div>Loading...</div>}><AutomatedPayoutCalculationsAndReconciliationCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/governance-compliance-automation-audit-approvals" element={<React.Suspense fallback={<div>Loading...</div>}><GovernanceComplianceAutomationAuditApprovalsCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/financial-system-integration-for-revenue-tracking" element={<React.Suspense fallback={<div>Loading...</div>}><FinancialSystemIntegrationForRevenueTrackingCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/strategic-partner-recommendation-engine" element={<React.Suspense fallback={<div>Loading...</div>}><StrategicPartnerRecommendationEngineCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/legalclm-system-integration" element={<React.Suspense fallback={<div>Loading...</div>}><LegalclmSystemIntegrationCfs /></React.Suspense>} />
        <Route path="/batch09/gap-ai/ai-opportunity-scoring-and-stage-prediction" element={<React.Suspense fallback={<div>Loading...</div>}><AiOpportunityScoringAndStagePredictionGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/partner-performance-prediction" element={<React.Suspense fallback={<div>Loading...</div>}><PartnerPerformancePredictionGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/deal-stage-forecasting" element={<React.Suspense fallback={<div>Loading...</div>}><DealStageForecastingGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/conflict-resolution-recommendation" element={<React.Suspense fallback={<div>Loading...</div>}><ConflictResolutionRecommendationGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/governance-compliance-auto-checks" element={<React.Suspense fallback={<div>Loading...</div>}><GovernanceComplianceAutoChecksGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/payoutrevenue-share-management" element={<React.Suspense fallback={<div>Loading...</div>}><PayoutrevenueShareManagementGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/financial-reporting-and-reconciliation" element={<React.Suspense fallback={<div>Loading...</div>}><FinancialReportingAndReconciliationGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/contract-lifecycle-management-module" element={<React.Suspense fallback={<div>Loading...</div>}><ContractLifecycleManagementModuleGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/negotiation-playbook-template-library" element={<React.Suspense fallback={<div>Loading...</div>}><NegotiationPlaybookTemplateLibraryGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/mobile-partner-portal-ui" element={<React.Suspense fallback={<div>Loading...</div>}><MobilePartnerPortalUiGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/e-signature-integration" element={<React.Suspense fallback={<div>Loading...</div>}><ESignatureIntegrationGapNon /></React.Suspense>} />

      </Routes>
  )
}
