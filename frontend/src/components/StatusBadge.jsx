export default function StatusBadge({ status }) {
  if (!status) return null
  const s = String(status).toLowerCase().replace(/[\s-]/g, '_')

  let color = 'bg-gray-100 text-gray-700'
  if (['active', 'won', 'closed_won', 'completed', 'approved', 'delivered', 'resolved'].includes(s)) {
    color = 'bg-green-100 text-green-700'
  } else if (['pending', 'in_progress', 'review', 'negotiation', 'proposal', 'qualified', 'qualification'].includes(s)) {
    color = 'bg-yellow-100 text-yellow-700'
  } else if (['closed_lost', 'rejected', 'critical', 'high', 'overdue', 'cancelled', 'expired'].includes(s)) {
    color = 'bg-red-100 text-red-700'
  } else if (['new', 'draft', 'planning', 'discovery', 'open', 'low'].includes(s)) {
    color = 'bg-blue-100 text-blue-700'
  } else if (['dormant', 'restricted', 'inactive', 'archived', 'medium'].includes(s)) {
    color = 'bg-gray-100 text-gray-600'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {String(status).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  )
}
