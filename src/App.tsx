import { Routes, Route, Navigate } from 'react-router-dom';
import "@aws-amplify/ui-react/styles.css";
import Planner from './pages/Planner';
import Accounts from './pages/Accounts';
import Tracker from './pages/Tracker';
import Imports from './pages/Imports';
import Settings from './pages/Settings';
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

    useLayoutEffect(() => {
      maybeClearCachesBeforeFirstAuthedRender(user);
    }, [user]);

  return (
    <Routes>
        <Route element={<AppShell user={user} onSignOut={signOutWithCleanup} signedIn={signedIn} authLoading={authLoading} />}>
          {/* Public routes */}
          <Route path="/" element={<HomePage signedIn={signedIn} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<LoginPage signedIn={signedIn} authLoading={authLoading} />} />

          {/* Protected routes */}
          <Route element={<RequireAuth signedIn={signedIn} loading={authLoading} />}>
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/imports" element={<Imports />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
    </Routes>
  );
}

export default App;
