import { useState } from 'react'
import { dcfApi } from '../../../api/accounting'
import { Sparkles, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

export default function ScenarioCards({ modelId, scenarios, onGenerate, onRefresh, loading }) {
  const [calculating, setCalculating] = useState({})

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

  const handleCalculate = async (scenarioType) => {
    setCalculating((prev) => ({ ...prev, [scenarioType]: true }))
    try {
      await dcfApi.calculateScenario(modelId, { scenario_type: scenarioType })
      await onRefresh()
    } catch (err) {
      console.error('Failed to calculate scenario:', err)
    } finally {
      setCalculating((prev) => ({ ...prev, [scenarioType]: false }))
    }
  }

  const scenarioConfig = {
    bull: {
      label: 'Bull Case',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Optimistic scenario with stronger growth assumptions',
    },
    base: {
      label: 'Base Case',
      icon: Minus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Most likely scenario based on historical trends',
    },
    bear: {
      label: 'Bear Case',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Pessimistic scenario with headwinds',
    },
  }

  // Create scenario map
  const scenarioMap = {}
  scenarios.forEach((s) => {
    scenarioMap[s.scenario_type] = s
  })

  if (scenarios.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Sparkles className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="font-semibold mb-2">Generate Scenarios</h3>
        <p className="text-gray-500 mb-4 max-w-md mx-auto">
          Use AI to generate Bull, Base, and Bear case scenarios with different growth
          assumptions and probability weights.
        </p>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Scenarios with AI
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Scenario Analysis</h3>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['bull', 'base', 'bear'].map((type) => {
          const config = scenarioConfig[type]
          const scenario = scenarioMap[type]
          const Icon = config.icon

          return (
            <div
              key={type}
              className={`card p-6 border-2 ${config.borderColor} ${config.bgColor}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon className={`w-5 h-5 ${config.color}`} />
                <h4 className="font-semibold">{config.label}</h4>
                {scenario?.ai_probability && (
                  <span className="ml-auto text-sm text-gray-500">
                    {formatPercent(scenario.ai_probability)} probability
                  </span>
                )}
              </div>

              {scenario ? (
                <>
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Enterprise Value</p>
                      <p className={`text-2xl font-bold ${config.color}`}>
                        {formatCurrency(scenario.enterprise_value)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Revenue Growth</p>
                        <p className="font-medium">
                          {formatPercent(scenario.revenue_growth_rate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Expense Growth</p>
                        <p className="font-medium">
                          {formatPercent(scenario.expense_growth_rate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Discount Rate</p>
                        <p className="font-medium">
                          {formatPercent(scenario.discount_rate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Terminal Growth</p>
                        <p className="font-medium">
                          {formatPercent(scenario.terminal_growth_rate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {scenario.ai_reasoning && (
                    <p className="text-xs text-gray-500 italic mb-4">
                      {scenario.ai_reasoning}
                    </p>
                  )}

                  <button
                    onClick={() => handleCalculate(type)}
                    disabled={calculating[type]}
                    className="btn-secondary w-full text-sm"
                  >
                    {calculating[type] ? 'Calculating...' : 'Recalculate'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-500">{config.description}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Weighted Summary */}
      {scenarios.length >= 2 && (
        <WeightedSummary modelId={modelId} scenarios={scenarios} />
      )}
    </div>
  )
}

function WeightedSummary({ modelId, scenarios }) {
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadComparison = async () => {
    setLoading(true)
    try {
      const response = await dcfApi.compareScenarios(modelId)
      setComparison(response.data)
    } catch (err) {
      console.error('Failed to compare:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (!comparison) {
    return (
      <div className="card p-6 text-center">
        <h4 className="font-semibold mb-2">Probability-Weighted Valuation</h4>
        <p className="text-sm text-gray-500 mb-4">
          Calculate the expected value based on scenario probabilities
        </p>
        <button
          onClick={loadComparison}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Calculating...' : 'Calculate Weighted Value'}
        </button>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h4 className="font-semibold mb-4">Probability-Weighted Valuation</h4>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-500">Low (Bear)</p>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(comparison.range?.low)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">Expected Value</p>
          <p className="text-2xl font-bold text-amber-600">
            {formatCurrency(comparison.weighted?.enterprise_value)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500">High (Bull)</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(comparison.range?.high)}
          </p>
        </div>
      </div>

      {/* Visual Range */}
      <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-gradient-to-r from-red-400 via-amber-400 to-green-400"
          style={{ width: '100%' }}
        />
        {comparison.range && comparison.weighted && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-black"
            style={{
              left: `${
                ((comparison.weighted.enterprise_value - comparison.range.low) /
                  (comparison.range.high - comparison.range.low)) *
                100
              }%`,
            }}
          />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">Bear</span>
        <span className="text-xs text-gray-500">Bull</span>
      </div>
    </div>
  )
}
