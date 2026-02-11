import { Box, Flex, Button, HStack, Heading, Badge } from '@chakra-ui/react';
import { RouterLink } from "../components/RouterLink";
import { Tooltip } from '../components/ui/Tooltip';
import { requestOpenWelcomeModal } from '../services/welcomeModalPreference';
import { IoSettingsSharp } from 'react-icons/io5';
import { formatUsernameForDisplay } from '../services/userDisplay';
import type { AuthUserLike, UserUI } from '../types';
import { useUserUI } from '../hooks/useUserUI';
import { useDemoMode } from "../hooks/useDemoMode";
import { useDemoTourStore } from "../store/demoTourStore";

type NavigationProps = {
  user?: AuthUserLike | null;
  userUI?: UserUI | null;
};

export default function Navigation({ user, userUI }: NavigationProps) {

  const { userUI: hookUserUI } = useUserUI();
  const effectiveUserUI = userUI ?? hookUserUI;

  /* Omitted until we have a better need for this in the UI,
  // and to avoid unnecessary re-renders of the Navigation component when updates change
  const { loading } = 
  const refreshing = loading && hasLoadedData;
  */

  const authKey = user?.username ?? user?.userId;
  const userUIMatchesAuth =
    !authKey || !effectiveUserUI?.username || effectiveUserUI.username === authKey;

  const safeUserUI = userUIMatchesAuth ? effectiveUserUI : null;

  const username = authKey ?? safeUserUI?.username;
  const role = safeUserUI?.role ?? user?.role;
  const signedIn = Boolean(username);
  const isAdmin = role === "Admin";
  const { isDemo } = useDemoMode(signedIn);
  const demoTourDisabled = useDemoTourStore((s: any) => s.disabled);
  const openDemoTour = useDemoTourStore((s: any) => s.openTour);

  const displayUsername = signedIn ? formatUsernameForDisplay(username ?? null) : null;

  return (
    <HStack
      position="sticky"
      top="0"
      zIndex="1000"
      bg={{ base: "teal.300", _dark: "teal.700" }}
      color="white"
      boxShadow="sm"
      px={4}
      py={3}
      shadow="md"
      minW="400px"
      borderBottomWidth="1px"
      borderBottomColor={{ base: "teal.400", _dark: "teal.600" }}
    >
      <Flex justifyContent="space-between" alignItems="center" width="100%">
        <RouterLink to="/">{() => <Heading size="lg">{"Budgeteer"}</Heading>}</RouterLink>
          {signedIn ? (
            <Tooltip content="What’s new" showArrow>
              <Button
                size="sm"
                variant="ghost"
                fontWeight="600"
                color={"blue.600"}
                onClick={() => {
                  requestOpenWelcomeModal();
                }}
              >
                What’s new
              </Button>
            </Tooltip>
          ) : null}

          <HStack gap={3}>
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
                        bg={isActive ? "blackAlpha.100" : "transparent"}
                        _hover={{ bg: "blackAlpha.100" }}
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
                    color="black"
                    bg={isActive ? "blackAlpha.100" : "transparent"}
                    _hover={{ bg: "blackAlpha.100" }}
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
