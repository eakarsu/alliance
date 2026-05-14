import { useState } from 'react'
import { Sparkles, Target, TrendingUp, ShieldCheck } from 'lucide-react'
import api from '../api/axios'
import AIResponseDisplay from '../components/AIResponseDisplay'

const tabs = [
  { value: 'score', label: 'Opportunity Scoring', icon: Target, endpoint: '/ai/score-opportunity' },
  { value: 'forecast', label: 'Stage Forecast', icon: TrendingUp, endpoint: '/ai/forecast-stage' },
  { value: 'governance', label: 'Governance Check', icon: ShieldCheck, endpoint: '/ai/governance-check' },
]

function formatResult(data) {
  if (!data) return ''
  if (typeof data === 'string') return data
  return data.analysis || data.result || data.response || JSON.stringify(data, null, 2)
}

export default function AIInsights() {
  const [tab, setTab] = useState('score')
  const [opportunityId, setOpportunityId] = useState('')
  const [actionDescription, setActionDescription] = useState('')
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const activeTab = tabs.find(t => t.value === tab)

  const reset = () => {
    setError('')
    setResult(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    reset()

    let payload = {}
    if (tab === 'score' || tab === 'forecast') {
      if (!opportunityId.trim()) {
        setError('Opportunity ID is required.')
        return
      }
      payload = { opportunity_id: opportunityId.trim(), opportunityId: opportunityId.trim() }
    } else if (tab === 'governance') {
      if (!actionDescription.trim()) {
        setError('Action description is required.')
        return
      }
      payload = {
        action: actionDescription.trim(),
        description: actionDescription.trim(),
      }
      if (entityType.trim()) payload.entity_type = entityType.trim()
      if (entityId.trim()) payload.entity_id = entityId.trim()
    }

    setLoading(true)
    try {
      const res = await api.post(activeTab.endpoint, payload)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Request failed.')
    } finally {
      setLoading(false)
    }
  }

  const switchTab = (value) => {
    setTab(value)
    reset()
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-sm text-gray-500">
            Score opportunities, forecast stages, and check governance compliance.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 px-3 py-2 text-white shadow-sm">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-medium">Powered by LLM</span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
        {tabs.map(t => {
          const Icon = t.icon
          const active = t.value === tab
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => switchTab(t.value)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
        >
          {(tab === 'score' || tab === 'forecast') && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Opportunity ID
              </label>
              <input
                type="text"
                value={opportunityId}
                onChange={(e) => setOpportunityId(e.target.value)}
                placeholder="e.g. 42 or opp-123"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                {tab === 'score'
                  ? 'Returns a win-probability score with key factors and next actions.'
                  : 'Returns predicted next stage, time-to-close estimate, and blockers.'}
              </p>
            </div>
          )}

          {tab === 'governance' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Action description
                </label>
                <textarea
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the action to evaluate (e.g. share roadmap with channel partner X)"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Entity type (optional)
                  </label>
                  <input
                    type="text"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    placeholder="e.g. opportunity"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Entity ID (optional)
                  </label>
                  <input
                    type="text"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Run {activeTab?.label}
              </>
            )}
          </button>
        </form>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm min-h-[200px]">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Result</h2>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Working...
            </div>
          )}
          {!loading && !result && !error && (
            <p className="text-sm text-gray-400">
              Submit the form to see AI-generated insights here.
            </p>
          )}
          {!loading && result && (
            <AIResponseDisplay response={formatResult(result)} />
          )}
        </div>
      </div>
    </div>
  )
}
