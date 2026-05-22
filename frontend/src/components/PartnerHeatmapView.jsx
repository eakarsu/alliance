import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Grid3x3, RefreshCcw } from 'lucide-react'

function shade(v) {
  // value 0..100 → blue intensity
  const t = Math.max(0, Math.min(100, v)) / 100
  const r = Math.round(239 + (37 - 239) * t)
  const g = Math.round(246 + (99 - 246) * t)
  const b = Math.round(255 + (235 - 255) * t)
  return `rgb(${r},${g},${b})`
}

export default function PartnerHeatmapView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await api.get('/custom-views/partner-heatmap')
      setData(r.data)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const partners = data?.partners || []
  const metrics = data?.metrics || []
  const cellMap = {}
  for (const c of data?.cells || []) cellMap[`${c.partner}|${c.metric}`] = c.value

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-semibold text-slate-800">Partner Contribution Heatmap</h3>
        </div>
        <button onClick={load} className="rounded border border-slate-300 p-1 hover:bg-slate-50" title="Reload">
          <RefreshCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading && <div className="py-8 text-center text-sm text-slate-500">Loading heatmap…</div>}
      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!loading && data && (
        <div className="overflow-x-auto" data-testid="heatmap-grid">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-left font-medium text-slate-600">
                  Partner \ Metric
                </th>
                {metrics.map((m) => (
                  <th key={m} className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-left font-medium text-slate-600">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p}>
                  <td className="border-b border-slate-100 px-2 py-1 font-medium text-slate-700">{p}</td>
                  {metrics.map((m) => {
                    const v = cellMap[`${p}|${m}`] ?? 0
                    return (
                      <td
                        key={`${p}|${m}`}
                        title={`${p} · ${m} = ${v}`}
                        className="border-b border-slate-100 px-2 py-1 text-center font-mono text-[11px]"
                        style={{ background: shade(v), color: v > 60 ? 'white' : '#0f172a' }}
                      >
                        {v}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span>low</span>
            <div className="h-3 w-40 rounded bg-gradient-to-r from-[rgb(239,246,255)] to-[rgb(37,99,235)]" />
            <span>high</span>
          </div>
        </div>
      )}
    </div>
  )
}
