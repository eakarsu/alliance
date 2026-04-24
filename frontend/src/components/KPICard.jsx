export default function KPICard({ icon: Icon, title, value, trend, gradient = 'from-blue-500 to-blue-600', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg cursor-pointer
        transform transition-all duration-200 hover:scale-105 hover:shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="mt-1 text-3xl font-bold">{value ?? 0}</p>
          {trend && (
            <p className="mt-1 text-xs text-white/70">{trend}</p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-white/20 p-3">
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10" />
    </div>
  )
}
