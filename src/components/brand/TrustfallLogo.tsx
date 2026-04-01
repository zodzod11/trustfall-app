import { cn } from '../../utils/cn'

/** Served from `public/logo.png` (Vite root). */
export const TRUSTFALL_LOGO_SRC = '/logo.png'

type TrustfallLogoProps = {
  className?: string
  /** `header` — nav / sticky bars; `page` — onboarding & marketing scale */
  size?: 'header' | 'page'
}

/**
 * Full Trustfall wordmark + mark from brand asset. Parent should set `aria-label`
 * when used inside a link (image is decorative there).
 */
export function TrustfallLogo({ className, size = 'header' }: TrustfallLogoProps) {
  return (
    <img
      src={TRUSTFALL_LOGO_SRC}
      alt=""
      width={200}
      height={64}
      draggable={false}
      className={cn(
        'object-contain object-left select-none',
        size === 'header' && 'h-8 w-auto max-h-8 max-w-[120px]',
        size === 'page' && 'h-11 w-auto max-w-[min(220px,85vw)] sm:h-12',
        className,
      )}
    />
  )
}
