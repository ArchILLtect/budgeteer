import { Box, Flex, Button, HStack, Heading, Badge, IconButton } from '@chakra-ui/react';
import { RouterLink } from "../components/RouterLink";
import { Tooltip } from '../components/ui/Tooltip';
import { requestOpenWelcomeModal } from '../services/welcomeModalPreference';
import { IoSettingsSharp } from 'react-icons/io5';
import { MdDarkMode, MdLightMode, MdNewReleases } from "react-icons/md";
import { formatUsernameForDisplay } from '../services/userDisplay';
import type { AuthUserLike, UserUI } from '../types';
import { useUserUI } from '../hooks/useUserUI';
import { useDemoMode } from "../hooks/useDemoMode";
import { useDemoTourStore } from "../store/demoTourStore";
import { useColorModeClass } from "../hooks/useColorModeClass";
import { usePresenceHeartbeat } from "../hooks/usePresenceHeartbeat";
import { usePresenceStore } from "../store/presenceStore";
import { useShallow } from "zustand/react/shallow";

type NavigationProps = {
  user?: AuthUserLike | null;
  userUI?: UserUI | null;
};

export default function Navigation({ user, userUI }: NavigationProps) {

  const { mode, toggle } = useColorModeClass();

  const { userUI: hookUserUI } = useUserUI();
  const effectiveUserUI = userUI ?? hookUserUI;
  const authKey = user?.username ?? user?.userId;
  const userUIMatchesAuth =
    !authKey || !effectiveUserUI?.username || effectiveUserUI.username === authKey;

  const safeUserUI = userUIMatchesAuth ? effectiveUserUI : null;

  const username = authKey ?? safeUserUI?.username;
  const role = safeUserUI?.role ?? user?.role;
  const signedIn = Boolean(username);
  const isAdmin = role === "Admin";
  const { isDemo } = useDemoMode(signedIn);
  const demoTourDisabled = useDemoTourStore((s) => s.disabled);
  const openDemoTour = useDemoTourStore((s) => s.openTour);

  const displayUsername = signedIn ? formatUsernameForDisplay(username ?? null) : null;

  const userId = user?.userId ?? null;
  usePresenceHeartbeat({ enabled: Boolean(userId), userId });

  const presence = usePresenceStore(
    useShallow((s) => ({
      status: s.status,
      lastAttemptAtMs: s.lastAttemptAtMs,
      lastOkAtMs: s.lastOkAtMs,
      lastError: s.lastError,
    }))
  );

  const presenceLabel =
    presence.status === "online"
      ? "Online"
      : presence.status === "offline"
        ? "Offline"
        : "Checking…";

  const presencePalette =
    presence.status === "online"
      ? "green"
      : presence.status === "offline"
        ? "red"
        : "gray";

  const presenceTooltipParts: string[] = [];
  if (presence.lastOkAtMs) {
    presenceTooltipParts.push(`Last ok: ${new Date(presence.lastOkAtMs).toLocaleTimeString()}`);
  }
  if (presence.lastAttemptAtMs) {
    presenceTooltipParts.push(
      `Last check: ${new Date(presence.lastAttemptAtMs).toLocaleTimeString()}`
    );
  }
  if (presence.status === "offline" && presence.lastError) {
    presenceTooltipParts.push(presence.lastError);
  }
  const presenceTooltip =
    presenceTooltipParts.length > 0 ? presenceTooltipParts.join(" • ") : "Presence";

  return (
    <HStack
      position="sticky"
      top="0"
      zIndex="1000"
      bg={{ base: "teal.300", _dark: "teal.700" }}
      color="teal.800"
      boxShadow="sm"
      px={{ base: 2, sm: 4 }}
      py={{ base: 2, sm: 3 }}
      shadow="md"
      w="100%"
      minW={0}
      borderBottomWidth="1px"
      borderBottomColor={{ base: "teal.400", _dark: "teal.600" }}
      overflowX="hidden"
    >
      <Flex justifyContent="space-between" alignItems="center" width="100%" minW={0}>
        <RouterLink to="/">{() =>
          <Heading
            size={{ base: "xl", sm: "2xl" }}
            pb={1}
            px={2}
            borderRadius={"xl"}
            fontWeight={"bolder"}
            color={{ base: "teal.800", _dark: "teal.300" }}
            _hover={{ bg: { base: "teal.800", _dark: "teal.300" }, color: { base: "teal.300", _dark: "teal.800" } }}
          >
            {"Budgeteer"}
          </Heading>
        }</RouterLink>
        {signedIn ? (
          <Tooltip content="What’s new" showArrow>
            <>
              <Button
                display={{ base: "none", sm: "inline-flex" }}
                size="sm"
                variant="ghost"
                fontWeight="600"
                color={"blue.600"}
                _hover={{ bg: "blue.100" }}
                onClick={() => {
                  requestOpenWelcomeModal();
                }}
              >
                What’s new
              </Button>
              <IconButton
                display={{ base: "inline-flex", sm: "none" }}
                aria-label="What’s new"
                variant="ghost"
                onClick={() => {
                  requestOpenWelcomeModal();
                }}
                color={{ base: "teal.800", _dark: "teal.300" }}
                _hover={{ bg: { base: "teal.800", _dark: "teal.300" }, color: { base: "teal.300", _dark: "teal.800" } }}
              >
                <MdNewReleases />
              </IconButton>
            </>
          </Tooltip>
        ) : null}

          <HStack gap={{ base: 1, sm: 3 }} minW={0}>
            {/*{refreshing ? (
              <HStack gap={2} color="gray.600">
                <Spinner size="sm" />
                <Text fontSize="sm">Refreshing…</Text>
              </HStack>
            ) : null}*/}
            {signedIn ? (
              <>
                <RouterLink to="/profile">
                {({ isActive }) => (
                    <Box
                        px={3}
                        py={1}
                        rounded="md"
                        fontWeight="600"
                        color={{ base: "teal.800", _dark: "teal.300" }}
                        _hover={{ bg: { base: "teal.800", _dark: "teal.300" }, color: { base: "teal.300", _dark: "teal.800" } }}
                        bg={isActive ? "teal.600" : { base: "teal.300", _dark: "teal.700" }}
                        display={{ base: "none", sm: "block" }}
                        maxW="160px"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        textOverflow="ellipsis"
                    >
                        {displayUsername}
                    </Box>
                )}
                </RouterLink>

                {isAdmin ? (
                  <Badge rounded="md" bg="purple.100" color="purple.800">
                    Admin
                  </Badge>
                ) : null}

                {userId ? (
                  <Tooltip content={presenceTooltip} showArrow>
                    <Badge rounded="md" colorPalette={presencePalette}>
                      {presenceLabel}
                    </Badge>
                  </Tooltip>
                ) : null}

                {isDemo ? (
                  demoTourDisabled ? (
                    <Badge rounded="md" bg="orange.100" color="orange.800">
                      Demo Mode
                    </Badge>
                  ) : (
                    <Tooltip content="Open demo tour" showArrow>
                      <Badge
                        as="button"
                        rounded="md"
                        bg="orange.100"
                        color="orange.800"
                        cursor="pointer"
                        _hover={{ bg: "orange.200" }}
                        _focusVisible={{ outline: "2px solid", outlineColor: "blue.400", outlineOffset: "2px" }}
                        onClick={() => {
                          openDemoTour();
                        }}
                      >
                        Demo Mode
                      </Badge>
                    </Tooltip>
                  )
                ) : null}
              </>
            ) : (
              <RouterLink to="/login">{() => <Button as="span" size="sm" variant="solid">Sign in</Button>}</RouterLink>
            )}

            <Tooltip content={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"} showArrow>
              <IconButton
                aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                variant="ghost"
                onClick={toggle}
                color={{ base: "teal.800", _dark: "teal.300" }}
                _hover={{ bg: { base: "teal.800", _dark: "teal.300" }, color: { base: "teal.300", _dark: "teal.800" } }}
              >
                {mode === "dark" ? <MdLightMode /> : <MdDarkMode />}
              </IconButton>
            </Tooltip>

            {signedIn ? (
              <RouterLink to={"/settings"} aria-label="Settings">
                {({ isActive }) => (
                  <Button
                    as="span"
                    variant="ghost"
                    justifyContent="flex-start"
                    width="100%"
                    paddingX={2}
                    fontWeight="700"
                    color={{ base: "teal.800", _dark: "teal.300" }}
                    _hover={{ bg: { base: "teal.800", _dark: "teal.300" }, color: { base: "teal.300", _dark: "teal.800" } }}
                    bg={isActive ? "teal.00" : { base: "teal.300", _dark: "teal.700" }}
                  >
                    <IoSettingsSharp />
                  </Button>
                )}
              </RouterLink>
            ) : null}
          </HStack>
        </Flex>
    </HStack>
  );
}
