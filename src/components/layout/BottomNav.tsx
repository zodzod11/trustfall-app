import { NavLink } from 'react-router-dom'
import { cn } from '../../utils/cn'

const tabs = [
  {
    to: '/explore',
    label: 'Explore',
    end: false,
    icon: ExploreIcon,
  },
  {
    to: '/match',
    label: 'Get Matched',
    end: false,
    icon: SparkIcon,
  },
  {
    to: '/saved',
    label: 'Saved',
    end: true,
    icon: BookmarkIcon,
  },
  {
    to: '/profile',
    label: 'Profile',
    end: true,
    icon: UserIcon,
  },
] as const

export function BottomNav() {
  return (
    <nav className="tf-nav-shell fixed bottom-0 left-0 right-0 z-50" aria-label="Primary">
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        {tabs.map(({ to, label, end, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium tracking-wide transition-colors',
                isActive
                  ? 'text-accent'
                  : 'text-muted hover:text-secondary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full transition-colors',
                    isActive ? 'bg-primary/20' : 'bg-transparent',
                  )}
                  aria-hidden
                >
                  <Icon active={isActive} />
                </span>
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={active ? 'text-accent' : 'text-current'}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.5-4.5" strokeLinecap="round" />
    </svg>
  )
}

function SparkIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={active ? 'text-accent' : 'text-current'}
    >
      <path
        d="M12 2v4M12 18v4M4 12H2M22 12h-2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  )
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={active ? 'text-accent' : 'text-current'}
    >
      <path
        d="M7 4h10a2 2 0 012 2v15l-7-4-7 4V6a2 2 0 012-2z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={active ? 'text-accent' : 'text-current'}
    >
      <circle cx="12" cy="9" r="3.5" />
      <path
        d="M6 19.5c1.2-2.5 3.8-4 6-4s4.8 1.5 6 4"
        strokeLinecap="round"
      />
    </svg>
  )
}
