import { Outlet } from "react-router-dom";
import { Box, Container, Flex, Link } from "@chakra-ui/react";
import { Toaster } from "../components/ui/Toaster";
import { StorageDisclosureBanner } from "../components/ui/StorageDisclosureBanner.tsx";
import Navigation from "./Navigation";
import Footer from "./Footer.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import type { AuthUserLike } from "../types";
import { Suspense } from "react";
import { BasicSpinner } from "../components/ui/BasicSpinner.tsx";
import { useBootstrapUserProfile } from "../hooks/useBootstrapUserProfile";
import { WelcomeModal } from "../components/ui/WelcomeModal";

type AppShellProps = {
  user?: AuthUserLike | null;
  onSignOut?: () => void;
  signedIn: boolean;
  authLoading: boolean;
};


export function AppShell({ user, onSignOut, signedIn, authLoading }: AppShellProps) {

  useBootstrapUserProfile(user);

  return (
    <Flex direction="column" h="100vh" bg="gray.50" overflow={"hidden"} className="AppShell" position="relative">
      <Link
        href="#main-content"
        position="absolute"
        left={2}
        top={2}
        px={3}
        py={2}
        bg="white"
        borderWidth="1px"
        borderColor="blue.200"
        rounded="md"
        boxShadow="sm"
        zIndex={9999}
        transform="translateY(-200%)"
        _focusVisible={{ transform: "translateY(0)", outline: "2px solid", outlineColor: "blue.400" }}
      >
        Skip to content
      </Link>
      <Toaster />
      <WelcomeModal signedIn={signedIn && !authLoading} />

      <Flex minH="100vh" direction="column" bg="gray.50">
        <Navigation />
        <Box as="main" flex="1" py={{ base: 6, md: 10 }}>
          <Container maxW="6xl" px={{ base: 4, md: 8 }}>
            <ErrorBoundary title="Page Crashed">
              <Suspense fallback={<BasicSpinner />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </Container>
        </Box>
        <Footer signedIn={signedIn} onSignOut={onSignOut} />
      </Flex>

      <StorageDisclosureBanner />
    </Flex>
  );
}