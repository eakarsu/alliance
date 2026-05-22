import { useEffect, useState } from 'react'
import api from '../api/axios'
import { Settings, Plus, Trash2, Save, RefreshCcw } from 'lucide-react'

const emptyDR = { area: '', owner_role: '', approval_threshold: '', notes: '' }
const emptyContrib = { partner: '', contribution_type: 'capital', value_pct: 0, period: '', notes: '' }

export default function GovernanceRulesEditor() {
  const [data, setData] = useState({ decision_rights: [], contributions: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newDR, setNewDR] = useState(emptyDR)
  const [newContrib, setNewContrib] = useState(emptyContrib)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await api.get('/custom-views/rules')
      setData({ decision_rights: r.data.decision_rights || [], contributions: r.data.contributions || [] })
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const create = async (kind, payload, resetFn) => {
    try {
      await api.post('/custom-views/rules', { kind, ...payload })
      resetFn()
      load()
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    }
  }
  const update = async (kind, id, patch) => {
    try {
      await api.put(`/custom-views/rules/${kind}/${id}`, patch)
      load()
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    }
  }
  const remove = async (kind, id) => {
    if (!window.confirm('Delete this entry?')) return
    try {
      await api.delete(`/custom-views/rules/${kind}/${id}`)
      load()
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="rules-editor">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-600" />
          <h3 className="text-base font-semibold text-slate-800">Governance &amp; Operating Rules</h3>
        </div>
        <button onClick={load} className="rounded border border-slate-300 p-1 hover:bg-slate-50" title="Reload">
          <RefreshCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading && <div className="mb-3 text-sm text-slate-500">Loading…</div>}

      {/* Decision Rights */}
      <div className="mb-6">
        <h4 className="mb-2 text-sm font-semibold text-slate-700">Decision Rights</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-2 py-1 text-left">Area</th>
                <th className="px-2 py-1 text-left">Owner Role</th>
                <th className="px-2 py-1 text-left">Approval Threshold</th>
                <th className="px-2 py-1 text-left">Notes</th>
                <th className="px-2 py-1 text-left w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.decision_rights.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={r.area} onBlur={(e) => e.target.value !== r.area && update('decision_rights', r.id, { area: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={r.owner_role} onBlur={(e) => e.target.value !== r.owner_role && update('decision_rights', r.id, { owner_role: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={r.approval_threshold} onBlur={(e) => e.target.value !== r.approval_threshold && update('decision_rights', r.id, { approval_threshold: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={r.notes} onBlur={(e) => e.target.value !== r.notes && update('decision_rights', r.id, { notes: e.target.value })} /></td>
                  <td className="px-2 py-1">
                    <button className="rounded p-1 text-red-600 hover:bg-red-50" onClick={() => remove('decision_rights', r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50/60">
                <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5" placeholder="area"
                       value={newDR.area} onChange={(e) => setNewDR({ ...newDR, area: e.target.value })} /></td>
                <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5" placeholder="owner_role"
                       value={newDR.owner_role} onChange={(e) => setNewDR({ ...newDR, owner_role: e.target.value })} /></td>
                <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5" placeholder="approval_threshold"
                       value={newDR.approval_threshold} onChange={(e) => setNewDR({ ...newDR, approval_threshold: e.target.value })} /></td>
                <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5" placeholder="notes"
                       value={newDR.notes} onChange={(e) => setNewDR({ ...newDR, notes: e.target.value })} /></td>
                <td className="px-2 py-1">
                  <button className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-0.5 text-white hover:bg-purple-700"
                          onClick={() => newDR.area && create('decision_rights', newDR, () => setNewDR(emptyDR))}>
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Contributions */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-slate-700">Partner Contributions</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-2 py-1 text-left">Partner</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Value %</th>
                <th className="px-2 py-1 text-left">Period</th>
                <th className="px-2 py-1 text-left">Notes</th>
                <th className="px-2 py-1 text-left w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.contributions.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={c.partner} onBlur={(e) => e.target.value !== c.partner && update('contributions', c.id, { partner: e.target.value })} /></td>
                  <td className="px-2 py-1">
                    <select className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={c.contribution_type}
                       onChange={(e) => update('contributions', c.id, { contribution_type: e.target.value })}>
                      <option value="capital">capital</option>
                      <option value="capability">capability</option>
                      <option value="channel">channel</option>
                      <option value="ip">ip</option>
                      <option value="delivery">delivery</option>
                    </select>
                  </td>
                  <td className="px-2 py-1"><input type="number" className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={c.value_pct} onBlur={(e) => Number(e.target.value) !== c.value_pct && update('contributions', c.id, { value_pct: Number(e.target.value) })} /></td>
                  <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={c.period} onBlur={(e) => e.target.value !== c.period && update('contributions', c.id, { period: e.target.value })} /></td>
                  <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       defaultValue={c.notes} onBlur={(e) => e.target.value !== c.notes && update('contributions', c.id, { notes: e.target.value })} /></td>
                  <td className="px-2 py-1">
                    <button className="rounded p-1 text-red-600 hover:bg-red-50" onClick={() => remove('contributions', c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50/60">
                <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5" placeholder="partner"
                       value={newContrib.partner} onChange={(e) => setNewContrib({ ...newContrib, partner: e.target.value })} /></td>
                <td className="px-2 py-1">
                  <select className="w-full rounded border border-slate-200 px-1.5 py-0.5"
                       value={newContrib.contribution_type}
                       onChange={(e) => setNewContrib({ ...newContrib, contribution_type: e.target.value })}>
                    <option value="capital">capital</option>
                    <option value="capability">capability</option>
                    <option value="channel">channel</option>
                    <option value="ip">ip</option>
                    <option value="delivery">delivery</option>
                  </select>
                </td>
                <td className="px-2 py-1"><input type="number" className="w-full rounded border border-slate-200 px-1.5 py-0.5" placeholder="%"
                       value={newContrib.value_pct} onChange={(e) => setNewContrib({ ...newContrib, value_pct: Number(e.target.value) })} /></td>
                <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5" placeholder="2026-Q2"
                       value={newContrib.period} onChange={(e) => setNewContrib({ ...newContrib, period: e.target.value })} /></td>
                <td className="px-2 py-1"><input className="w-full rounded border border-slate-200 px-1.5 py-0.5" placeholder="notes"
                       value={newContrib.notes} onChange={(e) => setNewContrib({ ...newContrib, notes: e.target.value })} /></td>
                <td className="px-2 py-1">
                  <button className="inline-flex items-center gap-1 rounded bg-purple-600 px-2 py-0.5 text-white hover:bg-purple-700"
                          onClick={() => newContrib.partner && create('contributions', newContrib, () => setNewContrib(emptyContrib))}>
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <Save className="h-3 w-3" /> Edits save on blur (per cell).
        </p>
      </div>
    </div>
  )
}
