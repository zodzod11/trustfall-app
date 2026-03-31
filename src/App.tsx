import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { SavedProvider } from './hooks/SavedProvider'
import { ExploreDetailPage } from './pages/ExploreDetailPage'
import { ExplorePage } from './pages/ExplorePage'
import { MatchPage } from './pages/MatchPage'
import { MatchResultsPage } from './pages/MatchResultsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProfilePage } from './pages/ProfilePage'
import { ProfessionalPage } from './pages/ProfessionalPage'
import { SavedPage } from './pages/SavedPage'

export default function App() {
  return (
    <SavedProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<AppShell />}>
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:id" element={<ExploreDetailPage />} />
            <Route path="/match" element={<MatchPage />} />
            <Route path="/match/results" element={<MatchResultsPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/pros/:id" element={<ProfessionalPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/explore" replace />} />
          <Route path="*" element={<Navigate to="/explore" replace />} />
        </Routes>
      </BrowserRouter>
    </SavedProvider>
  )
}
