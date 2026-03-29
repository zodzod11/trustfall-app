import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useScrollRestoration } from '../../hooks/useScrollRestoration'

export function AppShell() {
  useScrollRestoration()

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-gradient-to-b from-background via-background to-surface/30 shadow-soft">
      <main className="flex-1 px-4 pb-28 pt-[calc(0.85rem+env(safe-area-inset-top))] sm:px-5 sm:pt-[calc(1rem+env(safe-area-inset-top))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
