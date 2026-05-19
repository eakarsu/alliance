import ActivityTimelineView from '../components/ActivityTimelineView'
import PartnerHeatmapView from '../components/PartnerHeatmapView'
import StatusBriefPDFView from '../components/StatusBriefPDFView'
import GovernanceRulesEditor from '../components/GovernanceRulesEditor'
import { Layers } from 'lucide-react'

export default function CustomViewsPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alliance Views</h1>
          <p className="text-sm text-slate-500">
            Custom views built on the Alliance / Partner Management dataset — timeline, heatmap,
            governance brief, and operating rules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityTimelineView />
        <PartnerHeatmapView />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <StatusBriefPDFView />
        <GovernanceRulesEditor />
      </div>
    </div>
  )
}
