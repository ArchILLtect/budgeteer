import { Outlet } from "react-router-dom";
import { Box, Flex, IconButton, Link } from "@chakra-ui/react";
import { Toaster } from "../components/ui/Toaster";
import { StorageDisclosureBanner } from "../components/ui/StorageDisclosureBanner.tsx";
import Header from "./Header.tsx";
import Footer from "./Footer.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import type { AuthUserLike } from "../types";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BasicSpinner } from "../components/ui/BasicSpinner.tsx";
import { useBootstrapUserProfile } from "../hooks/useBootstrapUserProfile";
import { WelcomeModal } from "../components/ui/WelcomeModal";
import { GlobalProgressOverlay } from "../components/ui/GlobalProgressOverlay";
import { Sidebar } from "./Sidebar.tsx";
import { PublicSidebar } from "./PublicSidebar.tsx";
import { SIDEBAR_WIDTH } from "../config/sidebar";
import { useSidebarWidthPreset } from "../store/localSettingsStore";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { useBudgetStore } from "../store/budgetStore";
import IngestionMetricsPanel from "../components/accounts/IngestionMetricsPanel";
import { fireToast } from "../hooks/useFireToast";
import { STORAGE_REPAIR_NOTICE_KEY } from "../services/userScopedStorage";

type AppShellProps = {
  user?: AuthUserLike | null;
  onSignOut?: () => void;
  signedIn: boolean;
  authLoading: boolean;
};


export function AppShell({ user, onSignOut, signedIn, authLoading }: AppShellProps) {

  const sidebarWidthPreset = useSidebarWidthPreset();
  const sidebarWidth = useMemo(() => SIDEBAR_WIDTH[sidebarWidthPreset] ?? SIDEBAR_WIDTH.small, [sidebarWidthPreset]);

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Chakra's default `md` breakpoint is 48em (768px). No SSR in this app.
    return window.matchMedia?.("(min-width: 48em)")?.matches ?? true;
  });

  const showIngestionBenchmark = useBudgetStore((s) => s.showIngestionBenchmark);
  const lastIngestionBenchmarkMetrics = useBudgetStore((s) => s.lastIngestionBenchmarkMetrics);
  const lastIngestionBenchmarkSessionId = useBudgetStore((s) => s.lastIngestionBenchmarkSessionId);

  useBootstrapUserProfile(user);

  useEffect(() => {
    try {
      const repairedAt = localStorage.getItem(STORAGE_REPAIR_NOTICE_KEY);
      if (!repairedAt) return;
      localStorage.removeItem(STORAGE_REPAIR_NOTICE_KEY);
      fireToast(
        "warning",
        "Local data was reset",
        "Some saved app data was unreadable and has been cleared to keep Budgeteer working."
      );
    } catch {
      // ignore
    }
  }, []);

  return (
    <Flex direction="column" h="100vh" bg="bg.subtle" color="fg" overflow={"hidden"} className="AppShell" position="relative">
      <Link
        href="#main-content"
        position="absolute"
        left={2}
        top={2}
        px={3}
        py={2}
        bg="bg.panel"
        borderWidth="1px"
        borderColor="border"
        rounded="md"
        boxShadow="sm"
        zIndex={9999}
        transform="translateY(-200%)"
        _focusVisible={{ transform: "translateY(0)", outline: "2px solid", outlineColor: "blue.400" }}
      >
        Skip to content
      </Link>
      <Toaster />
      <WelcomeModal signedIn={signedIn} authLoading={authLoading} />
      <GlobalProgressOverlay />

      <Header user={user}/>

      {/* Body: sidebar + main */}
      {/* Sidebar */}
      <Flex flex="1" minH={0} overflow={"hidden"} position="relative">
        {/* Collapsible sidebar wrapper (shrinks to 0 when closed) */}
        <Box
          flexShrink={0}
          h="100%"
          w={sidebarOpen ? sidebarWidth : "0px"}
          transition="width 200ms ease"
          overflow="hidden"
          pointerEvents={sidebarOpen ? "auto" : "none"}
        >
          <Box
            id="app-sidebar"
            h="100%"
            w={sidebarWidth}
            overflowY="auto"
            transform={sidebarOpen ? "translateX(0)" : "translateX(-100%)"}
            transition="transform 200ms ease"
          >
            {authLoading ? (
              <Box w={sidebarWidth} h="100%">
                <BasicSpinner height="100%" width="100%" size="md" />
              </Box>
            ) : signedIn ? (
              <Sidebar />
            ) : (
              <PublicSidebar />
            )}
          </Box>
        </Box>

        {/* Mid-height toggle arrow */}
        <IconButton
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
          size="sm"
          variant="outline"
          bg="bg.panel"
          borderColor="border"
          position="absolute"
          top="50%"
          left={sidebarOpen ? sidebarWidth : "0px"}
          transform={sidebarOpen ? "translate(-50%, -50%)" : "translate(0, -50%)"}
          zIndex={2000}
          onClick={() => setSidebarOpen((v) => !v)}
        >
          {sidebarOpen ? <MdChevronLeft /> : <MdChevronRight />}
        </IconButton>

        {/* Main area is the primary scroll container */}
        <Box flex="1" minW={0} h="100%" overflow="auto" className="Main" id="main-content" tabIndex={-1}>
          <ErrorBoundary title="Page Crashed">
            {import.meta.env.DEV && showIngestionBenchmark ? (
              <Box
                position="sticky"
                top={0}
                zIndex={1500}
                px={4}
                py={3}
                borderBottomWidth={1}
                borderColor="border"
                bg="bg.subtle"
              >
                <Box maxW="6xl" mx="auto" w="full">
                  {lastIngestionBenchmarkMetrics ? (
                    <IngestionMetricsPanel
                      metrics={lastIngestionBenchmarkMetrics}
                      sessionId={lastIngestionBenchmarkSessionId ?? undefined}
                    />
                  ) : (
                    <Box fontSize="sm" color="fg.muted">
                      Ingestion benchmark panel is enabled, but no ingestion run has been captured yet.
                    </Box>
                  )}
                </Box>
              </Box>
            ) : null}
            <Suspense fallback={<BasicSpinner />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </Box>
      </Flex>

      <StorageDisclosureBanner />
      <Footer signedIn={signedIn} onSignOut={onSignOut} />
    </Flex>
  );
}