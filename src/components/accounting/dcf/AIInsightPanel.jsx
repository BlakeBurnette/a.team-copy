import { useState } from 'react'
import { Sparkles, Check, X, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react'

export default function AIInsightPanel({
  modelId,
  model,
  onAnalyze,
  onGenerateProjections,
  onAccept,
  loading,
  aiProjections,
}) {
  const [expandedSection, setExpandedSection] = useState('analysis')
  const [analysis, setAnalysis] = useState(null)

  // Parse AI reasoning if available
  const parsedAnalysis = model.ai_reasoning ? (() => {
    try {
      return JSON.parse(model.ai_reasoning)
    } catch {
      return null
    }
  })() : null

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

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  return (
    <div className="space-y-4">
      {/* Analysis Section */}
      <div className="card">
        <button
          onClick={() => toggleSection('analysis')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span className="font-semibold">AI Analysis</span>
            {parsedAnalysis && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Complete
              </span>
            )}
          </div>
          {expandedSection === 'analysis' ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {expandedSection === 'analysis' && (
          <div className="p-4 pt-0 space-y-4">
            {parsedAnalysis ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Revenue Trend</p>
                    <p className="font-semibold capitalize">
                      {parsedAnalysis.summary?.revenue_trend || '-'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Avg Revenue Growth</p>
                    <p className="font-semibold">
                      {formatPercent(parsedAnalysis.growth_rates?.revenue_annual_implied)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Avg EBITDA Margin</p>
                    <p className="font-semibold">
                      {formatPercent(parsedAnalysis.margins?.average_ebitda_margin)}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Confidence</p>
                    <p className="font-semibold">
                      {formatPercent(parsedAnalysis.confidence)}
                    </p>
                  </div>
                </div>

                {/* Seasonality */}
                {parsedAnalysis.seasonality?.detected && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Seasonality Detected</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {parsedAnalysis.seasonality.pattern}
                    </p>
                  </div>
                )}

                {/* Anomalies */}
                {parsedAnalysis.anomalies?.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-800">
                        {parsedAnalysis.anomalies.length} Anomalies Detected
                      </span>
                    </div>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {parsedAnalysis.anomalies.slice(0, 3).map((a, i) => (
                        <li key={i}>
                          {a.period}: {a.type} ({formatPercent(a.magnitude)}) - {a.recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {parsedAnalysis.recommendations && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800">AI Recommendations</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Revenue Growth:</span>{' '}
                        <span className="font-medium">
                          {formatPercent(parsedAnalysis.recommendations.suggested_revenue_growth)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Expense Growth:</span>{' '}
                        <span className="font-medium">
                          {formatPercent(parsedAnalysis.recommendations.suggested_expense_growth)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Discount Rate:</span>{' '}
                        <span className="font-medium">
                          {formatPercent(parsedAnalysis.recommendations.suggested_discount_rate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Terminal Growth:</span>{' '}
                        <span className="font-medium">
                          {formatPercent(parsedAnalysis.recommendations.suggested_terminal_growth)}
                        </span>
                      </div>
                    </div>
                    {parsedAnalysis.recommendations.reasoning && (
                      <p className="mt-2 text-xs text-gray-600 italic">
                        {parsedAnalysis.recommendations.reasoning}
                      </p>
                    )}
                  </div>
                )}

                {/* Analysis Notes */}
                {parsedAnalysis.analysis_notes && (
                  <p className="text-sm text-gray-600 italic">
                    {parsedAnalysis.analysis_notes}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">
                  Run AI analysis to identify patterns, trends, and get recommendations
                </p>
                <button
                  onClick={onAnalyze}
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Analyzing...' : 'Run AI Analysis'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Projections Section */}
      <div className="card">
        <button
          onClick={() => toggleSection('projections')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="font-semibold">AI-Generated Projections</span>
            {aiProjections.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {aiProjections.length} years
              </span>
            )}
          </div>
          {expandedSection === 'projections' ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {expandedSection === 'projections' && (
          <div className="p-4 pt-0 space-y-4">
            {aiProjections.length > 0 ? (
              <>
                {/* Projection Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Year</th>
                        <th className="px-3 py-2 text-right">Revenue</th>
                        <th className="px-3 py-2 text-right">EBITDA</th>
                        <th className="px-3 py-2 text-right">FCF</th>
                        <th className="px-3 py-2 text-center">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {aiProjections.map((proj) => (
                        <tr key={proj.year} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">{proj.year}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatCurrency(proj.revenue)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {formatCurrency(proj.ebitda)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-green-600">
                            {formatCurrency(proj.free_cash_flow)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {proj.ai_confidence && (
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  proj.ai_confidence >= 0.8
                                    ? 'bg-green-100 text-green-700'
                                    : proj.ai_confidence >= 0.6
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {formatPercent(proj.ai_confidence)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Reasoning for first projection */}
                {aiProjections[0]?.ai_reasoning && (
                  <p className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded">
                    {aiProjections[0].ai_reasoning}
                  </p>
                )}

                {/* Accept/Reject Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onAccept}
                    disabled={loading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Accept AI Projections
                  </button>
                  <button
                    onClick={onGenerateProjections}
                    disabled={loading}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Regenerate
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">
                  Generate AI-powered projections based on historical analysis
                </p>
                <button
                  onClick={onGenerateProjections}
                  disabled={loading || !parsedAnalysis}
                  className="btn-primary"
                >
                  {loading ? 'Generating...' : 'Generate AI Projections'}
                </button>
                {!parsedAnalysis && (
                  <p className="text-xs text-gray-400 mt-2">
                    Run AI Analysis first to enable projections
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
