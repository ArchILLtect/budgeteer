import { Routes, Route, Navigate } from 'react-router-dom';
import "@aws-amplify/ui-react/styles.css";
import PlannerPage from './pages/PlannerPage';
import AccountsPage from './pages/AccountsPage';
import SettingsPage from "./pages/SettingsPage"
import { RequireAuth } from "./routes/RequireAuth";
import { AppShell } from './layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { useAuthUser } from "./hooks/useAuthUser";
import { Hub } from 'aws-amplify/utils';
import { setUserStorageScopeKey } from './services/userScopedStorage';
import { resetUserSessionState } from './store/clearUserCaches';
import { useLayoutEffect } from 'react';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';
import ImportHistoryPage from './pages/ImportHistoryPage';
import TrackerPage from './pages/TrackerPage';
import { DevPage } from './pages/DevPage';
import { useDefaultLandingRoute } from './store/localSettingsStore';

// TODO(P3): Add lazy loading for pages and components, especially ones that pull in a lot of dependencies (e.g. the login page with Amplify UI).

let didRegisterAuthHubListener = false;
function ensureAuthLifecycleCacheGuards() {
  if (didRegisterAuthHubListener) return;
  didRegisterAuthHubListener = true;

  Hub.listen("auth", ({ payload }) => {
    const evt = String((payload as { event?: unknown } | undefined)?.event ?? "");

    // Belt + suspenders: clear caches if sign-out happens outside our TopBar flow.
    if (evt === "signOut" || evt === "signedOut") {
      setUserStorageScopeKey(null);
      resetUserSessionState();
      return;
    }
  });
}

ensureAuthLifecycleCacheGuards();

let lastAuthedUserKey: string | null = null;
function maybeClearCachesBeforeFirstAuthedRender(user?: { username?: string; userId?: string } | null) {
  const authKey = user?.username || user?.userId || null;
  if (!authKey) {
    lastAuthedUserKey = null;
    return;
  }

  if (lastAuthedUserKey === authKey) return;
  lastAuthedUserKey = authKey;

  resetUserSessionState();
}

function App() {

  const { user, signedIn, loading: authLoading, signOutWithCleanup } = useAuthUser();
  const defaultLandingRoute = useDefaultLandingRoute();

    useLayoutEffect(() => {
      maybeClearCachesBeforeFirstAuthedRender(user);
    }, [user]);

  return (
    <Routes>
        <Route element={<AppShell user={user} onSignOut={signOutWithCleanup} signedIn={signedIn} authLoading={authLoading} />}>
          {/* Public routes */}
          <Route path="/" element={<HomePage signedIn={signedIn} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/tracker" element={<TrackerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage signedIn={signedIn} authLoading={authLoading} />} />

          {/* Protected routes */}
          <Route element={<RequireAuth signedIn={signedIn} loading={authLoading} />}>
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/imports" element={<ImportHistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          {import.meta.env.DEV ? (
            <Route path="/dev" element={<DevPage />} />
          ) : null}
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={signedIn ? defaultLandingRoute : "/"} replace />} />
        </Route>
    </Routes>
  );
}

export default App;
