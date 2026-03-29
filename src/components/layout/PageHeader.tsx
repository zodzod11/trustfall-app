import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type PageHeaderProps = {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-3 sm:mb-8', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent/95">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-prose text-sm leading-relaxed text-muted sm:text-[15px]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}
