import { DollarSign, TrendingUp, Percent, Calendar } from 'lucide-react'

export default function ValuationSummary({ model }) {
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value) => {
    if (!value && value !== 0) return '-'
    return `${(value * 100).toFixed(1)}%`
  }

  const stats = [
    {
      label: 'Enterprise Value',
      value: formatCurrency(model.enterprise_value),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      highlight: true,
    },
    {
      label: 'PV of Cash Flows',
      value: formatCurrency(model.npv),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Terminal Value',
      value: formatCurrency(model.terminal_value),
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Discount Rate',
      value: formatPercent(model.discount_rate),
      icon: Percent,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className={`card p-4 ${stat.highlight ? 'ring-2 ring-green-200' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.highlight ? stat.color : ''}`}>
                {stat.value}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
