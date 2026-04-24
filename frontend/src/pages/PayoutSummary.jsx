import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle, Clock, ArrowLeft } from 'lucide-react'
import api from '../api/axios'
import DataTable from '../components/DataTable'
import SearchBar from '../components/SearchBar'
import StatusBadge from '../components/StatusBadge'

const fmt = (v) => v != null && v !== '' ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'

const columns = [
  { key: 'opportunity_name', label: 'Opportunity', render: (v) => v || '-' },
  { key: 'account_name', label: 'Account', render: (v) => v || '-' },
  { key: 'share_type', label: 'Share Type', render: (v) => v ? String(v).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-' },
  { key: 'share_percent', label: 'Share %', render: (v) => v != null ? `${v}%` : '-' },
  { key: 'share_basis', label: 'Basis', render: (v) => v ? fmt(v) : '-' },
  { key: 'calc_amount', label: 'Amount', render: (v) => v ? fmt(v) : '-' },
  { key: 'payout_status', label: 'Status', render: (v) => v ? <StatusBadge status={v} /> : '-' },
  { key: 'due_date', label: 'Due Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
]

export default function PayoutSummary() {
  const [data, setData] = useState([])
  const [totals, setTotals] = useState({ total_calc_amount: 0, total_paid: 0, total_pending: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/referrals/payout-summary')
        const items = res.data.data || []
        setData(Array.isArray(items) ? items : [])
        if (res.data.totals) setTotals(res.data.totals)
      } catch {
        setError('Failed to load payout summary')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const filtered = data.filter((r) => {
    const s = search.toLowerCase()
    return !s || `${r.opportunity_name} ${r.account_name} ${r.share_type} ${r.payout_status}`.toLowerCase().includes(s)
  })

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>

  if (selected) {
    return (
      <div className="animate-fade-in space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Payout Summary
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">{selected.opportunity_name}</h2>
            {selected.payout_status && <StatusBadge status={selected.payout_status} />}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['Opportunity', selected.opportunity_name],
              ['Account', selected.account_name],
              ['Share Type', selected.share_type ? String(selected.share_type).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null],
              ['Share Percent', selected.share_percent != null ? `${selected.share_percent}%` : null],
              ['Share Basis', selected.share_basis ? fmt(selected.share_basis) : null],
              ['Calculated Amount', selected.calc_amount ? fmt(selected.calc_amount) : null],
              ['Payout Status', selected.payout_status],
              ['Due Date', selected.due_date ? new Date(selected.due_date).toLocaleDateString() : null],
              ['Paid Date', selected.paid_date ? new Date(selected.paid_date).toLocaleDateString() : null],
              ['Partner Entity', selected.partner_entity_name],
              ['Created', selected.created_at ? new Date(selected.created_at).toLocaleDateString() : null],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">{l}</p>
                <p className="mt-1 text-sm text-gray-900">{v != null && v !== '' ? String(v) : '-'}</p>
              </div>
            ))}
          </div>
          {selected.notes && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selected.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const summaryCards = [
    {
      label: 'Total Earned',
      value: fmt(totals.total_calc_amount),
      icon: DollarSign,
      color: 'bg-blue-50 border-blue-200 text-blue-700',
      iconColor: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Paid Out',
      value: fmt(totals.total_paid),
      icon: CheckCircle,
      color: 'bg-green-50 border-green-200 text-green-700',
      iconColor: 'bg-green-100 text-green-600',
    },
    {
      label: 'Pending',
      value: fmt(totals.total_pending),
      icon: Clock,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      iconColor: 'bg-yellow-100 text-yellow-600',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payout Summary</h1>
        <p className="text-sm text-gray-500">Revenue share and payout tracking</p>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-5 shadow-sm ${card.color}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconColor}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-75">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-sm">
        <SearchBar value={search} onChange={setSearch} placeholder="Search payouts..." />
      </div>

      <DataTable columns={columns} data={filtered} onRowClick={(row) => setSelected(row)} />
    </div>
  )
}
