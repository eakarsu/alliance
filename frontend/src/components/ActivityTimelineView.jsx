import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Activity, RefreshCcw } from 'lucide-react'

export default function ActivityTimelineView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [days, setDays] = useState(90)

  const load = async (d = days) => {
    setLoading(true); setError('')
    try {
      const r = await api.get(`/custom-views/activity-timeline?days=${d}&limit=200`)
      setData(r.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load(days) }, []) // eslint-disable-line

  const weekly = data?.weekly || []
  const maxC = Math.max(1, ...weekly.map((w) => w.count))
  const colors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea', '#0891b2']

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-slate-800">Alliance Activity Timeline</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => { const v = Number(e.target.value); setDays(v); load(v) }}
            className="rounded border border-slate-300 px-2 py-1 text-xs"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
          <button onClick={() => load(days)} className="rounded border border-slate-300 p-1 hover:bg-slate-50" title="Reload">
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {loading && <div className="py-8 text-center text-sm text-slate-500">Loading timeline…</div>}
      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!loading && data && (
        <>
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span><b>{data.total}</b> events</span>
            <span>window: <b>{data.days}d</b></span>
            <span>weeks: <b>{weekly.length}</b></span>
          </div>

          {/* Weekly bar chart */}
          <div className="h-40 w-full rounded bg-slate-50 p-2" data-testid="timeline-chart">
            <svg viewBox={`0 0 ${Math.max(weekly.length, 1) * 30} 120`} className="h-full w-full" preserveAspectRatio="none">
              {weekly.map((w, i) => {
                const h = (w.count / maxC) * 100
                return (
                  <g key={w.week}>
                    <rect
                      x={i * 30 + 6}
                      y={110 - h}
                      width={18}
                      height={h}
                      fill="#2563eb"
                      opacity={0.85}
                    />
                    <text x={i * 30 + 15} y={118} textAnchor="middle" fontSize="6" fill="#475569">
                      {w.week.slice(5)}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* By type legend */}
          <div className="mt-3 flex flex-wrap gap-2">
            {(data.by_type || []).map((t, i) => (
              <span key={t.type} className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ background: colors[i % colors.length] }}>
                {t.type}: {t.count}
              </span>
            ))}
          </div>

          {/* Recent events list */}
          <div className="mt-4 max-h-48 overflow-y-auto text-sm">
            {(data.events || []).slice(0, 12).map((e) => (
              <div key={e.id} className="flex items-start justify-between border-b border-slate-100 py-1.5">
                <div className="min-w-0">
                  <div className="truncate text-slate-700">{e.summary || '(no summary)'}</div>
                  <div className="text-xs text-slate-400">
                    {e.activity_type || 'event'} · {e.owner_name || 'unassigned'}
                  </div>
                </div>
                <div className="ml-3 shrink-0 text-xs text-slate-500">
                  {e.activity_date ? new Date(e.activity_date).toISOString().slice(0,10) : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
