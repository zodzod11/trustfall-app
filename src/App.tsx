import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { RequireOnboardingComplete } from './components/layout/RequireOnboardingComplete'
import { RootRoute } from './components/layout/RootRoute'
import { SavedProvider } from './hooks/SavedProvider'
import { ExploreDetailPage } from './pages/ExploreDetailPage'
import { ExplorePage } from './pages/ExplorePage'
import { MatchPage } from './pages/MatchPage'
import { MatchResultsPage } from './pages/MatchResultsPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { ProfilePage } from './pages/ProfilePage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfessionalPage } from './pages/ProfessionalPage'
import { SavedPage } from './pages/SavedPage'

export default function App() {
  return (
    <SavedProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireOnboardingComplete />}>
            <Route element={<AppShell />}>
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/explore/:id" element={<ExploreDetailPage />} />
              <Route path="/match" element={<MatchPage />} />
              <Route path="/match/results" element={<MatchResultsPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/pros/:id" element={<ProfessionalPage />} />
            </Route>
          </Route>
          <Route path="/" element={<RootRoute />} />
          <Route path="*" element={<RootRoute />} />
        </Routes>
      </BrowserRouter>
    </SavedProvider>
  )
}
