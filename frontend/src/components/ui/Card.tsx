import React from 'react'

type CardVariant = 'default' | 'bordered'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
  footer?: React.ReactNode
  actions?: React.ReactNode
  variant?: CardVariant
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-white shadow-sm border border-gray-100',
  bordered: 'bg-white border-2 border-gray-200',
}

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  footer,
  actions,
  variant = 'default',
}: CardProps) {
  const hasHeader = title || subtitle || actions

  return (
    <div className={`rounded-xl overflow-hidden ${variantClasses[variant]} ${className}`}>
      {hasHeader && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-gray-900 truncate">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}

      <div className="p-6">{children}</div>

      {footer && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">{footer}</div>
      )}
    </div>
  )
}
