import { Link } from 'react-router-dom'

export default function StatCard({ title, value, icon: Icon, trend, trendUp, to, color = 'amber', className = '' }) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  }

  const content = (
    <div className={`bg-white rounded-xl shadow-sm border p-4 ${to ? 'hover:shadow-md transition-shadow' : ''} ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`p-2 rounded-lg ${colors[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{title}</div>
          {trend && (
            <div
              className={`text-xs mt-1 ${
                trendUp ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (to) {
    return <Link to={to}>{content}</Link>
  }

  return content
}
