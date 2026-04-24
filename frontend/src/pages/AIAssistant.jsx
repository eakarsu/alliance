import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import api from '../api/axios'
import AIResponseDisplay from '../components/AIResponseDisplay'

const features = [
  { value: 'contacts', label: 'Analyze Contacts' },
  { value: 'leads', label: 'Analyze Leads' },
  { value: 'opportunities', label: 'Analyze Opportunities' },
  { value: 'products', label: 'Analyze Products' },
  { value: 'projects', label: 'Analyze Projects' },
  { value: 'partners', label: 'Analyze Partners' },
  { value: 'risks', label: 'Analyze Risks' },
  { value: 'pipeline', label: 'Pipeline Analysis' },
  { value: 'general', label: 'General Question' },
]

const featureQuestions = {
  contacts: [
    'Who are our most engaged contacts this quarter?',
    'Which contacts have the strongest relationship scores?',
    'Show contacts that need follow-up or re-engagement',
    'Summarize contact distribution by organization and region',
    'Which contacts are missing consent or have expired consent?',
    'Identify key decision-makers across our top accounts',
    'What is the average relationship strength trend over time?',
    'Which contacts have multiple roles across organizations?',
    'Show recently added contacts and their engagement status',
    'List contacts with upcoming birthdays or anniversaries',
    'Which contacts are linked to the most opportunities?',
    'Recommend contacts to prioritize for outreach this week',
  ],
  leads: [
    'What is the current lead conversion rate by source?',
    'Which leads are at risk of expiring their protection period?',
    'Are there any lead conflicts or duplicates to resolve?',
    'Rank leads by qualification score and recommend next steps',
    'What lead sources are generating the highest quality leads?',
    'Show leads that have been idle for more than 2 weeks',
    'Compare lead volume trends month over month',
    'Which regions or industries produce the most leads?',
    'What is the average time from lead creation to conversion?',
    'Identify hot leads that should be fast-tracked',
    'Show leads assigned to each team member and their status',
    'What percentage of leads convert to opportunities by source?',
  ],
  opportunities: [
    'What is the total pipeline value by stage?',
    'Which opportunities are most likely to close this month?',
    'Identify stalled opportunities that need attention',
    'Compare win rates across different pipelines',
    'What are the top opportunities by deal value?',
    'Which opportunities have been in the same stage too long?',
    'Show opportunity aging analysis across all pipelines',
    'What is the average deal cycle length by pipeline type?',
    'Which deal owners have the highest close rates?',
    'Forecast revenue for the current quarter',
    'Identify opportunities at risk of being lost',
    'Compare this quarter opportunity performance vs last quarter',
  ],
  products: [
    'Which products have the highest revenue contribution?',
    'Show product maturity levels and readiness assessment',
    'Which products are most frequently included in proposals?',
    'Compare product performance across different regions',
    'Identify products that need updated pricing or positioning',
    'What product combinations are most commonly sold together?',
    'Which SaaS products have the best renewal rates?',
    'Show product adoption trends over the last 6 months',
    'What products are underperforming relative to their potential?',
    'Recommend product bundles for upcoming enterprise deals',
    'Which consulting services generate the highest margins?',
    'List products approaching end-of-life or needing refresh',
  ],
  projects: [
    'Which projects are behind schedule or at risk?',
    'Show project milestone completion rates',
    'What is the resource utilization across active projects?',
    'Identify projects that need delivery manager attention',
    'Compare planned vs actual timelines for recent projects',
    'Which projects have upcoming milestones this month?',
    'Show project health dashboard across all active projects',
    'What is the average project delivery success rate?',
    'Which technical leads are overloaded with projects?',
    'Identify projects with budget overruns or scope creep',
    'List completed projects and their satisfaction scores',
    'What lessons learned should be applied to current projects?',
  ],
  partners: [
    'Who are our top-performing partners by revenue?',
    'Which partners have the most active deals in pipeline?',
    'Show partner performance trends over the last quarter',
    'Identify partners that need engagement or reactivation',
    'What is the revenue sharing breakdown by partner?',
    'Which partners are best suited for upcoming opportunities?',
    'Compare channel vs referral partner effectiveness',
    'Show partner onboarding pipeline and status',
    'Which partners have the highest deal win rates?',
    'Identify partner capability gaps for strategic deals',
    'What is the average revenue per partner by tier?',
    'Recommend partners for co-selling on current opportunities',
  ],
  risks: [
    'What are the highest severity risks across all deals?',
    'Show risks that need immediate mitigation action',
    'Summarize risk distribution by category and status',
    'Which projects or opportunities have the most open risks?',
    'What mitigation strategies have been most effective?',
    'Identify new or escalating risks from the past week',
    'Show compliance-related risks and their current status',
    'What is the risk exposure by region or business unit?',
    'List risks with overdue mitigation deadlines',
    'Provide a risk heat map summary across all entities',
    'Which risk owners need to update their action plans?',
    'Compare risk trends this quarter vs previous quarter',
  ],
  pipeline: [
    'What is the overall pipeline health and velocity?',
    'Show conversion rates between each pipeline stage',
    'Which pipeline has the best win rate?',
    'Forecast expected revenue for next quarter based on pipeline',
    'Identify bottleneck stages where deals get stuck',
    'Compare pipeline performance across different teams',
    'What is the pipeline coverage ratio for our targets?',
    'Show deal flow trends over the past 3 months',
    'Which stages have the longest average dwell time?',
    'Analyze pipeline leakage — where are we losing deals?',
    'Compare Direct Sales vs Channel pipeline performance',
    'What is the Government pipeline outlook for this quarter?',
  ],
  general: [
    'Give me an executive summary of CRM performance',
    'What are the top priorities for this week?',
    'Show key metrics and KPIs across the platform',
    'Which areas need the most attention right now?',
    'Summarize recent activity and trends',
    'What recommendations do you have to improve our processes?',
    'How is overall revenue tracking against targets?',
    'Which persona/team is performing best this quarter?',
    'Show a cross-functional summary of all open items',
    'What are the biggest wins and losses this month?',
    'Identify bottlenecks slowing down our deal velocity',
    'Provide strategic recommendations for next quarter planning',
  ],
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [feature, setFeature] = useState('general')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || loading) return

    const userMsg = { role: 'user', content: messageText, feature, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await api.post('/ai/analyze', {
        feature,
        query: messageText,
        prompt: messageText,
      })

      const aiContent = res.data.analysis || res.data.response || res.data.result || res.data.message || (typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2))

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toISOString()
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I encountered an error processing your request: ${err.response?.data?.error || err.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
        isError: true
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuestionClick = (question) => {
    sendMessage(question)
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500">Intelligent insights for your CRM data</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Analyze:</label>
          <select
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {features.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col">
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-4">
            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-4 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Alliance AI Assistant</h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Ask me to analyze your CRM data. Select a category above and pick a question below, or type your own.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
                  {msg.role === 'user' ? (
                    <div className="rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white">
                      {msg.feature !== 'general' && (
                        <span className="mb-1 block text-xs text-blue-200">[{features.find(f => f.value === msg.feature)?.label}]</span>
                      )}
                      {msg.content}
                    </div>
                  ) : (
                    <div className={msg.isError ? 'rounded-xl border border-red-200 bg-red-50 p-4' : ''}>
                      {msg.isError ? (
                        <p className="text-sm text-red-600">{msg.content}</p>
                      ) : (
                        <AIResponseDisplay response={msg.content} />
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Suggested questions - always visible based on selected feature */}
        <div className="border-t border-gray-100 bg-gray-50/50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Suggested questions for {features.find(f => f.value === feature)?.label}:
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
            {(featureQuestions[feature] || featureQuestions.general).map((question) => (
              <button
                key={question}
                onClick={() => handleQuestionClick(question)}
                disabled={loading}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSend} className="mt-4 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI assistant about your CRM data..."
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  )
}
