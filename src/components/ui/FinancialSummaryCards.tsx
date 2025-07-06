import React from 'react'
import { formatCurrency } from '@/lib/utils'

interface FinancialSummary {
  totalBeforeTax: number
  totalTax: number
  totalAfterTax: number
}

interface FinancialSummaryCardsProps {
  summary: FinancialSummary
  className?: string
}

const FinancialSummaryCards: React.FC<FinancialSummaryCardsProps> = ({ 
  summary, 
  className = "" 
}) => {
  const cards = [
    {
      title: "Tổng tiền trước thuế",
      value: summary.totalBeforeTax,
      icon: "💰",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      valueColor: "text-blue-900"
    },
    {
      title: "Tổng tiền thuế",
      value: summary.totalTax,
      icon: "📊",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200", 
      textColor: "text-orange-700",
      valueColor: "text-orange-900"
    },
    {
      title: "Tổng tiền sau thuế",
      value: summary.totalAfterTax,
      icon: "💵",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      valueColor: "text-green-900"
    }
  ]

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 ${className}`}>
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} ${card.borderColor} border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className={`text-sm font-medium ${card.textColor} mb-1`}>
                {card.title}
              </div>
              <div className={`text-2xl font-bold ${card.valueColor}`}>
                {formatCurrency(card.value)}
              </div>
            </div>
            <div className="text-2xl ml-3">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default FinancialSummaryCards
